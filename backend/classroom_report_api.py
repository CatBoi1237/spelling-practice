from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException


def _utcnow():
    return datetime.now(timezone.utc)


def _parse(value: Optional[str]):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


def _report_id(room: dict) -> str:
    stamp = _parse(room.get("started_at")) or _parse(room.get("created_at")) or _utcnow()
    return f"{room['code']}-{stamp.strftime('%Y%m%dT%H%M%S%f')}"


def _snapshot_current_round(room: dict):
    round_index = int(room.get("round_index", -1))
    word = (room.get("current_word") or "").strip()
    if round_index < 0 or not word:
        return None

    rows = []
    for student in room.get("students", []):
        answered = student.get("answered_round", -1) == round_index
        timed_this_round = student.get("last_time_round", -1) == round_index
        rows.append({
            "player_id": student.get("player_id"),
            "name": student.get("name", "Student"),
            "registered": bool(student.get("registered")),
            "answered": answered,
            "answer": student.get("last_answer") if answered else None,
            "correct": bool(student.get("last_correct")) if answered else False,
            "points": int(student.get("last_points", 0)) if answered else 0,
            "time_ms": int(student.get("last_time_ms", 0)) if answered and timed_this_round else 0,
            "total_points": int(student.get("total_points", 0)),
        })

    return {
        "round_index": round_index,
        "word": word,
        "started_at": room.get("round_started_at"),
        "revealed_at": _utcnow().isoformat(),
        "time_limit_ms": int(room.get("time_limit_ms", 0)),
        "students": rows,
    }


def _summary(report: dict):
    rounds = report.get("rounds", [])
    total_answers = 0
    correct_answers = 0
    response_times = []
    missed = {}
    per_student = {}

    for round_row in rounds:
        word = round_row.get("word", "")
        for student in round_row.get("students", []):
            pid = student.get("player_id")
            if not pid:
                continue
            entry = per_student.setdefault(pid, {
                "player_id": pid,
                "name": student.get("name", "Student"),
                "registered": bool(student.get("registered")),
                "answered": 0,
                "correct": 0,
                "points": 0,
                "times_ms": [],
            })
            entry["name"] = student.get("name", entry["name"])
            entry["points"] = max(entry["points"], int(student.get("total_points", 0)))

            if not student.get("answered"):
                continue
            total_answers += 1
            entry["answered"] += 1
            time_ms = int(student.get("time_ms", 0) or 0)
            if time_ms > 0:
                response_times.append(time_ms)
                entry["times_ms"].append(time_ms)
            if student.get("correct"):
                correct_answers += 1
                entry["correct"] += 1
            elif word:
                missed[word] = missed.get(word, 0) + 1

    students = []
    for entry in per_student.values():
        answered = entry["answered"]
        students.append({
            "player_id": entry["player_id"],
            "name": entry["name"],
            "registered": entry["registered"],
            "answered": answered,
            "correct": entry["correct"],
            "accuracy": round(entry["correct"] / answered * 100) if answered else 0,
            "avg_time_ms": round(sum(entry["times_ms"]) / len(entry["times_ms"])) if entry["times_ms"] else 0,
            "points": entry["points"],
        })
    students.sort(key=lambda row: (-row["points"], -row["accuracy"], row["name"].casefold()))

    top_missed = [
        {"word": word, "misses": count}
        for word, count in sorted(missed.items(), key=lambda item: (-item[1], item[0].casefold()))[:15]
    ]

    return {
        "rounds": len(rounds),
        "students": len(per_student),
        "answers": total_answers,
        "correct": correct_answers,
        "accuracy": round(correct_answers / total_answers * 100) if total_answers else 0,
        "avg_time_ms": round(sum(response_times) / len(response_times)) if response_times else 0,
        "top_missed_words": top_missed,
        "student_results": students,
    }


def register_classroom_report_routes(
    *,
    api_router,
    db,
    get_current_user,
    require_teacher_account,
):
    async def record_round(code: str):
        room = await db.classrooms.find_one({"code": code.upper()})
        if not room:
            return
        snapshot = _snapshot_current_round(room)
        if not snapshot:
            return
        round_index = snapshot["round_index"]
        await db.classrooms.update_one(
            {
                "code": room["code"],
                "round_history.round_index": {"$ne": round_index},
            },
            {"$push": {"round_history": snapshot}},
        )

    async def archive_report(code: str):
        room = await db.classrooms.find_one({"code": code.upper()})
        if not room:
            return None
        if room.get("current_word") and room.get("revealed"):
            await record_round(code)
            room = await db.classrooms.find_one({"code": code.upper()})

        report_id = _report_id(room)
        report = {
            "report_id": report_id,
            "code": room["code"],
            "teacher_id": room.get("host_id"),
            "teacher_name": room.get("host_name", "Teacher"),
            "difficulty": room.get("difficulty"),
            "word_count": int(room.get("word_count", 0)),
            "time_limit_ms": int(room.get("time_limit_ms", 0)),
            "created_at": room.get("created_at"),
            "started_at": room.get("started_at"),
            "finished_at": room.get("finished_at") or _utcnow().isoformat(),
            "ended_early": bool(room.get("ended_early", False)),
            "students": [
                {
                    "player_id": student.get("player_id"),
                    "name": student.get("name", "Student"),
                    "registered": bool(student.get("registered")),
                    "total_points": int(student.get("total_points", 0)),
                }
                for student in room.get("students", [])
            ],
            "rounds": room.get("round_history", []),
            "saved_at": _utcnow().isoformat(),
        }
        report["summary"] = _summary(report)
        await db.classroom_reports.replace_one(
            {"report_id": report_id},
            report,
            upsert=True,
        )
        return report

    # Track each student's response time without changing the student-facing API.
    for route in api_router.routes:
        route_path = getattr(route, "path", "")
        methods = getattr(route, "methods", set()) or set()
        if not route_path.endswith("/classrooms/{code}/submit") or "POST" not in methods or not hasattr(route, "dependant"):
            continue
        original_call = route.dependant.call
        if getattr(original_call, "_spellbee_report_submit", False):
            continue

        async def tracked_submit(*args, __original=original_call, **kwargs):
            result = await __original(*args, **kwargs)
            code = str(kwargs.get("code") or "").upper()
            body = kwargs.get("body")
            user = kwargs.get("user")
            room = await db.classrooms.find_one({"code": code})
            if room and body:
                pid = str(user["_id"]) if user else body.player_id
                round_index = int(room.get("round_index", -1))
                student = next(
                    (row for row in room.get("students", []) if row.get("player_id") == pid),
                    None,
                )
                if (
                    student
                    and student.get("answered_round", -1) == round_index
                    and student.get("last_time_round", -2) != round_index
                ):
                    started = _parse(room.get("round_started_at"))
                    elapsed_ms = max(0, int((_utcnow() - started).total_seconds() * 1000)) if started else 0
                    await db.classrooms.update_one(
                        {"code": code, "students.player_id": pid},
                        {"$set": {
                            "students.$.last_time_ms": elapsed_ms,
                            "students.$.last_time_round": round_index,
                        }},
                    )
            return result

        tracked_submit._spellbee_report_submit = True
        route.dependant.call = tracked_submit
        route.endpoint = tracked_submit

    # Snapshot rounds on reveal and archive finished sessions in the cloud.
    wrap_targets = {
        "/classrooms/{code}/reveal": "reveal",
        "/classrooms/{code}/finish": "finish",
        "/classrooms/{code}/manage/end": "finish",
        "/classrooms/{code}/manage/rematch": "rematch",
    }
    for route in api_router.routes:
        route_path = getattr(route, "path", "")
        methods = getattr(route, "methods", set()) or set()
        target = next((kind for suffix, kind in wrap_targets.items() if route_path.endswith(suffix)), None)
        if not target or "POST" not in methods or not hasattr(route, "dependant"):
            continue

        original_call = route.dependant.call
        if getattr(original_call, "_spellbee_report_hook", False):
            continue

        async def report_hook(*args, __original=original_call, __target=target, **kwargs):
            code = str(kwargs.get("code") or "").upper()
            if __target == "rematch":
                await archive_report(code)
            result = await __original(*args, **kwargs)
            if __target == "reveal":
                await record_round(code)
            elif __target == "finish":
                await archive_report(code)
            elif __target == "rematch":
                await db.classrooms.update_one(
                    {"code": code},
                    {"$set": {"round_history": []}},
                )
            return result

        report_hook._spellbee_report_hook = True
        route.dependant.call = report_hook
        route.endpoint = report_hook

    @api_router.get("/teacher/classroom-reports")
    async def list_classroom_reports(user: dict = Depends(get_current_user)):
        await require_teacher_account(user)
        teacher_id = str(user["_id"])
        rows = await db.classroom_reports.find(
            {"teacher_id": teacher_id},
            {"_id": 0, "rounds": 0},
        ).sort("finished_at", -1).to_list(200)
        return {"reports": rows}

    @api_router.get("/teacher/classroom-reports/{report_id}")
    async def classroom_report_detail(
        report_id: str,
        user: dict = Depends(get_current_user),
    ):
        await require_teacher_account(user)
        row = await db.classroom_reports.find_one(
            {"report_id": report_id, "teacher_id": str(user["_id"])},
            {"_id": 0},
        )
        if not row:
            raise HTTPException(status_code=404, detail="Classroom report not found")
        if "summary" not in row:
            row["summary"] = _summary(row)
        return row

    @api_router.get("/teacher/classroom-analytics")
    async def classroom_analytics(user: dict = Depends(get_current_user)):
        await require_teacher_account(user)
        teacher_id = str(user["_id"])
        reports = await db.classroom_reports.find(
            {"teacher_id": teacher_id},
            {"_id": 0},
        ).sort("finished_at", -1).to_list(200)

        all_rounds = []
        for report in reports:
            all_rounds.extend(report.get("rounds", []))
        combined = _summary({"rounds": all_rounds})
        combined.update({
            "sessions": len(reports),
            "latest_session": reports[0].get("finished_at") if reports else None,
        })
        return combined
