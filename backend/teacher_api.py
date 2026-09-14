import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field


class ToggleBody(BaseModel):
    enabled: bool


class AddTimeBody(BaseModel):
    seconds: int = Field(default=10, ge=1, le=60)


class AccountTypeBody(BaseModel):
    account_type: str


class AssignmentCreateBody(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    words: List[str]
    due_at: Optional[str] = None
    attempts_allowed: int = Field(default=1, ge=1, le=5)
    level: str = Field(default="custom", max_length=32)


class AssignmentSubmitBody(BaseModel):
    player_id: str
    name: str = Field(min_length=1, max_length=24)
    answers: List[str]
    times_ms: List[int]


def _utcnow():
    return datetime.now(timezone.utc)


def _iso(dt=None):
    return (dt or _utcnow()).isoformat()


def _parse_due(value: Optional[str]):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid due date") from exc


def _clean_words(values):
    words = []
    seen = set()
    for raw in values or []:
        word = str(raw or "").strip()[:80]
        if not word:
            continue
        key = word.casefold()
        if key in seen:
            continue
        seen.add(key)
        words.append(word)
    if len(words) < 5 or len(words) > 50:
        raise HTTPException(status_code=400, detail="Assignments must contain between 5 and 50 unique words")
    return words


def _assignment_public(doc, include_words=True):
    out = {
        "code": doc["code"],
        "title": doc["title"],
        "teacher_name": doc.get("teacher_name", "Teacher"),
        "level": doc.get("level", "custom"),
        "word_count": len(doc.get("words", [])),
        "attempts_allowed": int(doc.get("attempts_allowed", 1)),
        "due_at": doc.get("due_at"),
        "status": doc.get("status", "active"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }
    if include_words:
        out["words"] = doc.get("words", [])
    return out


def register_teacher_routes(
    *,
    api_router,
    db,
    get_current_user,
    get_optional_user,
    public_user,
    new_code,
    get_classroom_or_404,
    classroom_view,
):
    async def resolve_account_type(user: dict) -> str:
        """
        Existing SpellBee accounts pre-date account roles. Preserve people who
        already used teacher features by promoting accounts that own an
        assignment or Classroom; all other legacy accounts become students.
        """
        role = user.get("account_type")
        if role in ("student", "teacher"):
            return role

        user_id = str(user["_id"])
        owns_assignment = await db.assignments.find_one(
            {"teacher_id": user_id},
            {"_id": 1},
        )
        owns_classroom = await db.classrooms.find_one(
            {"host_id": user_id},
            {"_id": 1},
        )
        role = "teacher" if owns_assignment or owns_classroom else "student"
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"account_type": role}},
        )
        user["account_type"] = role
        return role

    async def account_public(user: dict) -> dict:
        data = public_user(user)
        data["account_type"] = await resolve_account_type(user)
        return data

    async def require_teacher_account(user: dict) -> None:
        if await resolve_account_type(user) != "teacher":
            raise HTTPException(
                status_code=403,
                detail="A teacher account is required for this feature",
            )

    async def require_student_account(user: dict) -> None:
        if await resolve_account_type(user) != "student":
            raise HTTPException(status_code=403, detail="A student account is required for this feature")

    async def assignment_or_404(code: str):
        assignment = await db.assignments.find_one({"code": code.upper()})
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return assignment

    async def require_assignment_teacher(code: str, user: dict):
        await require_teacher_account(user)
        assignment = await assignment_or_404(code)
        if assignment["teacher_id"] != str(user["_id"]):
            raise HTTPException(status_code=403, detail="Only the teacher can manage this assignment")
        return assignment

    async def require_classroom_teacher(code: str, user: dict):
        await require_teacher_account(user)
        room = await get_classroom_or_404(code)
        if room["host_id"] != str(user["_id"]):
            raise HTTPException(status_code=403, detail="Only the teacher can manage this classroom")
        return room

    def classroom_management_view(room: dict, teacher_id: str):
        view = classroom_view(room, viewer_id=teacher_id, host_view=True)
        status = room.get("status", "lobby")
        view.update({
            "locked": status == "locked" or bool(room.get("locked", False)),
            "paused": status == "paused" or bool(room.get("paused", False)),
            "paused_remaining_ms": room.get("paused_remaining_ms"),
            "ended_early": bool(room.get("ended_early", False)),
            "finished_at": room.get("finished_at"),
        })
        return view

    # ---------------- account roles ----------------
    @api_router.get("/auth/account")
    async def get_account(user: dict = Depends(get_current_user)):
        return {"user": await account_public(user)}

    @api_router.post("/auth/account/type")
    async def set_account_type(
        body: AccountTypeBody,
        user: dict = Depends(get_current_user),
    ):
        target = (body.account_type or "").strip().lower()
        if target not in ("student", "teacher"):
            raise HTTPException(status_code=400, detail="Account type must be student or teacher")

        current = await resolve_account_type(user)
        if current != target:
            changed = await db.users.update_one(
                {"_id": user["_id"], "account_type": current},
                {"$set": {"account_type": target}},
            )
            if changed.modified_count != 1:
                raise HTTPException(status_code=409, detail="Account type changed on another device. Refresh and try again.")
            # Never alter the user's id or the collections keyed by that id.
            # Existing class memberships, submissions and teacher-owned work
            # become available again as soon as the corresponding role returns.
            user = await db.users.find_one({"_id": user["_id"]})

        return {"user": await account_public(user)}

    # Protect the teacher-controlled Classroom endpoints that live in server.py
    # without changing the public student join/read endpoints.
    protected_classroom_paths = {
        "/classrooms",
        "/classrooms/{code}/round/start",
        "/classrooms/{code}/reveal",
        "/classrooms/{code}/finish",
    }
    for route in api_router.routes:
        route_path = getattr(route, "path", "")
        methods = getattr(route, "methods", set()) or set()
        matched = any(route_path.endswith(path) for path in protected_classroom_paths)
        if not matched or "POST" not in methods or not hasattr(route, "dependant"):
            continue

        original_call = route.dependant.call
        if getattr(original_call, "_spellbee_teacher_guard", False):
            continue

        async def guarded_teacher_call(*args, __original=original_call, **kwargs):
            user = kwargs.get("user")
            if not user:
                raise HTTPException(status_code=401, detail="Not authenticated")
            await require_teacher_account(user)
            return await __original(*args, **kwargs)

        guarded_teacher_call._spellbee_teacher_guard = True
        route.dependant.call = guarded_teacher_call
        route.endpoint = guarded_teacher_call

    # Guests may join, but a signed-in Teacher cannot act as a Student in a
    # live Classroom. The membership stays in the room for a later switch back.
    student_classroom_paths = {
        "/classrooms/{code}/join",
        "/classrooms/{code}/ready",
        "/classrooms/{code}/submit",
    }
    for route in api_router.routes:
        route_path = getattr(route, "path", "")
        if not any(route_path.endswith(path) for path in student_classroom_paths):
            continue
        if "POST" not in (getattr(route, "methods", set()) or set()) or not hasattr(route, "dependant"):
            continue
        original_call = route.dependant.call

        async def guarded_student_call(*args, __original=original_call, **kwargs):
            user = kwargs.get("user")
            if user:
                await require_student_account(user)
            return await __original(*args, **kwargs)

        route.dependant.call = guarded_student_call
        route.endpoint = guarded_student_call

    for route in api_router.routes:
        if not getattr(route, "path", "").endswith("/classrooms/{code}") or "GET" not in (getattr(route, "methods", set()) or set()):
            continue
        original_call = route.dependant.call

        async def guarded_classroom_view(*args, __original=original_call, **kwargs):
            user = kwargs.get("user")
            if user and await resolve_account_type(user) != "teacher":
                room = await get_classroom_or_404(kwargs["code"])
                if room["host_id"] == str(user["_id"]):
                    raise HTTPException(status_code=403, detail="Switch to Teacher to manage this classroom")
            return await __original(*args, **kwargs)

        route.dependant.call = guarded_classroom_view
        route.endpoint = guarded_classroom_view

    # ---------------- teacher assignments ----------------
    @api_router.post("/assignments")
    async def create_assignment(
        body: AssignmentCreateBody,
        user: dict = Depends(get_current_user),
    ):
        await require_teacher_account(user)
        words = _clean_words(body.words)
        due = _parse_due(body.due_at)

        code = new_code()
        while await db.assignments.find_one({"code": code}):
            code = new_code()

        now = _iso()
        doc = {
            "code": code,
            "teacher_id": str(user["_id"]),
            "teacher_name": public_user(user)["name"],
            "title": body.title.strip()[:80],
            "words": words,
            "level": body.level.strip()[:32] or "custom",
            "attempts_allowed": int(body.attempts_allowed),
            "due_at": due.isoformat() if due else None,
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }
        await db.assignments.insert_one(doc)
        return _assignment_public(doc, include_words=True)

    @api_router.get("/assignments")
    async def list_assignments(user: dict = Depends(get_current_user)):
        await require_teacher_account(user)
        teacher_id = str(user["_id"])
        rows = await db.assignments.find(
            {"teacher_id": teacher_id},
            {"_id": 0},
        ).sort("created_at", -1).to_list(200)

        assignments = []
        for row in rows:
            item = _assignment_public(row, include_words=True)
            item["submission_count"] = await db.assignment_submissions.count_documents({
                "assignment_code": row["code"]
            })
            item["student_count"] = len(await db.assignment_submissions.distinct(
                "player_id", {"assignment_code": row["code"]}
            ))
            assignments.append(item)
        return {"assignments": assignments}

    @api_router.get("/assignments/{code}")
    async def get_assignment(
        code: str,
        player_id: Optional[str] = None,
        user: Optional[dict] = Depends(get_optional_user),
    ):
        if user:
            await require_student_account(user)
        assignment = await assignment_or_404(code)
        pid = str(user["_id"]) if user else player_id
        out = _assignment_public(assignment, include_words=True)
        if pid:
            attempts_used = await db.assignment_submissions.count_documents({
                "assignment_code": assignment["code"],
                "player_id": pid,
            })
            out["attempts_used"] = attempts_used
            out["attempts_remaining"] = max(0, int(assignment.get("attempts_allowed", 1)) - attempts_used)
            latest = await db.assignment_submissions.find_one(
                {"assignment_code": assignment["code"], "player_id": pid},
                {"_id": 0},
                sort=[("attempt", -1)],
            )
            out["latest_submission"] = latest
        return out

    @api_router.post("/assignments/{code}/submit")
    async def submit_assignment(
        code: str,
        body: AssignmentSubmitBody,
        user: Optional[dict] = Depends(get_optional_user),
    ):
        if user:
            await require_student_account(user)
        assignment = await assignment_or_404(code)
        if assignment.get("status", "active") != "active":
            raise HTTPException(status_code=400, detail="This assignment is closed")

        words = assignment.get("words", [])
        if len(body.answers) != len(words) or len(body.times_ms) != len(words):
            raise HTTPException(status_code=400, detail="Complete every word before submitting")

        pid = str(user["_id"]) if user else body.player_id
        name = (public_user(user)["name"] if user else body.name).strip()[:24]
        attempts_used = await db.assignment_submissions.count_documents({
            "assignment_code": assignment["code"],
            "player_id": pid,
        })
        allowed = int(assignment.get("attempts_allowed", 1))
        if attempts_used >= allowed:
            raise HTTPException(status_code=409, detail="You have used all attempts for this assignment")

        clean_answers = [str(answer or "").strip()[:100] for answer in body.answers]
        clean_times = [max(0, min(int(value or 0), 600_000)) for value in body.times_ms]
        results = [
            answer.casefold() == expected.strip().casefold()
            for answer, expected in zip(clean_answers, words)
        ]
        correct = sum(1 for result in results if result)
        total = len(words)
        missed = [
            {"word": expected, "answer": answer, "index": index}
            for index, (expected, answer, result) in enumerate(zip(words, clean_answers, results))
            if not result
        ]
        due = _parse_due(assignment.get("due_at"))
        now = _utcnow()
        submission = {
            "assignment_code": assignment["code"],
            "player_id": pid,
            "name": name,
            "registered": bool(user),
            "attempt": attempts_used + 1,
            "answers": clean_answers,
            "results": results,
            "correct": correct,
            "total": total,
            "accuracy": round(correct / total * 100),
            "missed": missed,
            "times_ms": clean_times,
            "avg_time_ms": round(sum(clean_times) / total) if total else 0,
            "duration_ms": sum(clean_times),
            "late": bool(due and now > due),
            "submitted_at": now.isoformat(),
        }
        await db.assignment_submissions.insert_one(submission)
        submission.pop("_id", None)
        return {"submission": submission, "attempts_remaining": max(0, allowed - submission["attempt"])}

    @api_router.get("/assignments/{code}/report")
    async def assignment_report(
        code: str,
        user: dict = Depends(get_current_user),
    ):
        assignment = await require_assignment_teacher(code, user)
        submissions = await db.assignment_submissions.find(
            {"assignment_code": assignment["code"]},
            {"_id": 0},
        ).sort([("name", 1), ("attempt", 1)]).to_list(1000)

        best = {}
        for submission in submissions:
            current = best.get(submission["player_id"])
            if (
                not current
                or submission.get("accuracy", 0) > current.get("accuracy", 0)
                or (
                    submission.get("accuracy", 0) == current.get("accuracy", 0)
                    and submission.get("avg_time_ms", 10**12) < current.get("avg_time_ms", 10**12)
                )
            ):
                best[submission["player_id"]] = submission

        best_rows = sorted(
            best.values(),
            key=lambda row: (-row.get("accuracy", 0), row.get("avg_time_ms", 10**12), row.get("name", "")),
        )
        class_accuracy = round(
            sum(row.get("accuracy", 0) for row in best_rows) / len(best_rows)
        ) if best_rows else 0
        return {
            "assignment": _assignment_public(assignment, include_words=True),
            "submissions": submissions,
            "best_submissions": best_rows,
            "summary": {
                "students": len(best_rows),
                "submissions": len(submissions),
                "class_accuracy": class_accuracy,
                "completed": len(best_rows),
            },
        }

    @api_router.post("/assignments/{code}/status")
    async def set_assignment_status(
        code: str,
        body: ToggleBody,
        user: dict = Depends(get_current_user),
    ):
        assignment = await require_assignment_teacher(code, user)
        status = "active" if body.enabled else "closed"
        await db.assignments.update_one(
            {"code": assignment["code"]},
            {"$set": {"status": status, "updated_at": _iso()}},
        )
        assignment = await assignment_or_404(code)
        return _assignment_public(assignment, include_words=True)

    @api_router.delete("/assignments/{code}")
    async def delete_assignment(
        code: str,
        user: dict = Depends(get_current_user),
    ):
        assignment = await require_assignment_teacher(code, user)
        await db.assignment_submissions.delete_many({"assignment_code": assignment["code"]})
        await db.assignments.delete_one({"code": assignment["code"]})
        return {"ok": True}

    # ---------------- classroom management ----------------
    @api_router.get("/classrooms/{code}/manage")
    async def get_classroom_management(
        code: str,
        user: dict = Depends(get_current_user),
    ):
        room = await require_classroom_teacher(code, user)
        return classroom_management_view(room, str(user["_id"]))

    @api_router.post("/classrooms/{code}/manage/lock")
    async def set_classroom_lock(
        code: str,
        body: ToggleBody,
        user: dict = Depends(get_current_user),
    ):
        room = await require_classroom_teacher(code, user)
        if room.get("status") not in ("lobby", "locked"):
            raise HTTPException(status_code=400, detail="The room can only be locked while waiting in the lobby")
        await db.classrooms.update_one(
            {"code": room["code"]},
            {"$set": {
                "status": "locked" if body.enabled else "lobby",
                "locked": bool(body.enabled),
            }},
        )
        room = await get_classroom_or_404(code)
        return classroom_management_view(room, str(user["_id"]))

    @api_router.post("/classrooms/{code}/manage/pause")
    async def set_classroom_pause(
        code: str,
        body: ToggleBody,
        user: dict = Depends(get_current_user),
    ):
        room = await require_classroom_teacher(code, user)
        now = _utcnow()

        if body.enabled:
            if room.get("status") != "running" or room.get("revealed"):
                raise HTTPException(status_code=400, detail="Only an active unrevealed round can be paused")
            started_at = datetime.fromisoformat(room["round_started_at"])
            elapsed_ms = max(0, int((now - started_at).total_seconds() * 1000))
            remaining_ms = max(0, int(room["time_limit_ms"]) - elapsed_ms)
            await db.classrooms.update_one(
                {"code": room["code"]},
                {"$set": {
                    "status": "paused",
                    "paused": True,
                    "paused_at": now.isoformat(),
                    "paused_remaining_ms": remaining_ms,
                }},
            )
        else:
            if room.get("status") != "paused":
                raise HTTPException(status_code=400, detail="This classroom is not paused")
            remaining_ms = max(0, int(room.get("paused_remaining_ms") or 0))
            elapsed_before_pause = int(room["time_limit_ms"]) - remaining_ms
            resumed_start = now - timedelta(milliseconds=elapsed_before_pause)
            await db.classrooms.update_one(
                {"code": room["code"]},
                {"$set": {
                    "status": "running",
                    "paused": False,
                    "paused_at": None,
                    "paused_remaining_ms": None,
                    "round_started_at": resumed_start.isoformat(),
                }},
            )

        room = await get_classroom_or_404(code)
        return classroom_management_view(room, str(user["_id"]))

    @api_router.post("/classrooms/{code}/manage/time")
    async def add_classroom_time(
        code: str,
        body: AddTimeBody,
        user: dict = Depends(get_current_user),
    ):
        room = await require_classroom_teacher(code, user)
        if room.get("status") not in ("running", "paused") or room.get("revealed"):
            raise HTTPException(status_code=400, detail="Extra time can only be added during an active round")

        delta = timedelta(seconds=body.seconds)
        if room.get("status") == "paused":
            await db.classrooms.update_one(
                {"code": room["code"]},
                {"$inc": {"paused_remaining_ms": body.seconds * 1000}},
            )
        else:
            started_at = datetime.fromisoformat(room["round_started_at"])
            await db.classrooms.update_one(
                {"code": room["code"]},
                {"$set": {"round_started_at": (started_at + delta).isoformat()}},
            )

        room = await get_classroom_or_404(code)
        return classroom_management_view(room, str(user["_id"]))

    @api_router.delete("/classrooms/{code}/students/{player_id}")
    async def kick_classroom_student(
        code: str,
        player_id: str,
        user: dict = Depends(get_current_user),
    ):
        room = await require_classroom_teacher(code, user)
        if room.get("status") == "finished":
            raise HTTPException(status_code=400, detail="This classroom has already finished")
        await db.classrooms.update_one(
            {"code": room["code"]},
            {"$pull": {"students": {"player_id": player_id}}},
        )
        room = await get_classroom_or_404(code)
        return classroom_management_view(room, str(user["_id"]))

    @api_router.post("/classrooms/{code}/manage/end")
    async def end_classroom_early(
        code: str,
        user: dict = Depends(get_current_user),
    ):
        room = await require_classroom_teacher(code, user)
        if room.get("status") == "finished":
            return classroom_management_view(room, str(user["_id"]))
        await db.classrooms.update_one(
            {"code": room["code"]},
            {"$set": {
                "status": "finished",
                "finished_at": _iso(),
                "ended_early": True,
                "revealed": bool(room.get("current_word")),
                "paused": False,
                "paused_remaining_ms": None,
                "locked": False,
            }},
        )
        room = await get_classroom_or_404(code)
        return classroom_management_view(room, str(user["_id"]))

    @api_router.post("/classrooms/{code}/manage/rematch")
    async def rematch_classroom(
        code: str,
        user: dict = Depends(get_current_user),
    ):
        room = await require_classroom_teacher(code, user)
        if room.get("status") != "finished":
            raise HTTPException(status_code=400, detail="Finish the classroom game before starting a rematch")

        reset_students = []
        for student in room.get("students", []):
            next_student = dict(student)
            next_student.update({
                "total_points": 0,
                "answered_round": -1,
                "last_answer": None,
                "last_correct": None,
                "last_points": 0,
                "ready": False,
            })
            reset_students.append(next_student)

        await db.classrooms.update_one(
            {"code": room["code"]},
            {"$set": {
                "seed": random.randint(1, 2_000_000_000),
                "status": "lobby",
                "round_index": -1,
                "round_started_at": None,
                "current_word": None,
                "revealed": False,
                "started_at": None,
                "finished_at": None,
                "ended_early": False,
                "locked": False,
                "paused": False,
                "paused_at": None,
                "paused_remaining_ms": None,
                "students": reset_students,
            }},
        )
        room = await get_classroom_or_404(code)
        return classroom_management_view(room, str(user["_id"]))

    # Keep the larger teacher platform split into a dedicated module so this
    # file stays focused on accounts, assignments and live Classroom controls.
    from class_api import register_class_routes

    register_class_routes(
        api_router=api_router,
        db=db,
        get_current_user=get_current_user,
        get_optional_user=get_optional_user,
        public_user=public_user,
        new_code=new_code,
        require_teacher_account=require_teacher_account,
        require_student_account=require_student_account,
    )
