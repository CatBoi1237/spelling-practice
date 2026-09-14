from datetime import datetime, timezone
from typing import List, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field


class ClassCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    year_level: Optional[str] = Field(default=None, max_length=40)


class ClassJoinBody(BaseModel):
    player_id: str
    name: str = Field(min_length=1, max_length=24)


class ClassArchiveBody(BaseModel):
    archived: bool


class ClassAssignmentBody(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    words: List[str]
    due_at: Optional[str] = None
    attempts_allowed: int = Field(default=1, ge=1, le=5)
    level: str = Field(default="custom", max_length=32)


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


def _assignment_card(doc):
    return {
        "code": doc["code"],
        "title": doc["title"],
        "level": doc.get("level", "custom"),
        "word_count": len(doc.get("words", [])),
        "attempts_allowed": int(doc.get("attempts_allowed", 1)),
        "due_at": doc.get("due_at"),
        "status": doc.get("status", "active"),
        "created_at": doc.get("created_at"),
        "class_code": doc.get("class_code"),
        "class_name": doc.get("class_name"),
    }


def register_class_routes(
    *,
    api_router,
    db,
    get_current_user,
    get_optional_user,
    public_user,
    new_code,
    require_teacher_account,
    require_student_account,
):
    async def class_or_404(code: str):
        doc = await db.school_classes.find_one({"code": code.upper()})
        if not doc:
            raise HTTPException(status_code=404, detail="Class not found")
        return doc

    async def require_class_teacher(code: str, user: dict):
        await require_teacher_account(user)
        doc = await class_or_404(code)
        if doc.get("teacher_id") != str(user["_id"]):
            raise HTTPException(status_code=403, detail="Only the class teacher can manage this class")
        return doc

    async def next_unique_code():
        for _ in range(100):
            code = new_code()
            collision = (
                await db.school_classes.find_one({"code": code}, {"_id": 1})
                or await db.assignments.find_one({"code": code}, {"_id": 1})
                or await db.classrooms.find_one({"code": code}, {"_id": 1})
                or await db.rooms.find_one({"code": code}, {"_id": 1})
            )
            if not collision:
                return code
        raise HTTPException(status_code=503, detail="Could not generate a class code")

    def student_member(doc, player_id: Optional[str]):
        if not player_id:
            return None
        return next(
            (student for student in doc.get("students", []) if student.get("player_id") == player_id),
            None,
        )

    async def public_class_view(doc: dict, player_id: Optional[str] = None):
        member = student_member(doc, player_id)
        out = {
            "code": doc["code"],
            "name": doc["name"],
            "year_level": doc.get("year_level"),
            "teacher_name": doc.get("teacher_name", "Teacher"),
            "student_count": len(doc.get("students", [])),
            "archived": bool(doc.get("archived", False)),
            "joined": bool(member),
            "member": {
                "player_id": member.get("player_id"),
                "name": member.get("name"),
                "registered": bool(member.get("registered")),
                "joined_at": member.get("joined_at"),
            } if member else None,
        }
        if member:
            assignments = await db.assignments.find(
                {"class_code": doc["code"], "status": {"$ne": "deleted"}},
                {"_id": 0},
            ).sort("created_at", -1).to_list(100)
            out["assignments"] = [_assignment_card(row) for row in assignments]
        else:
            out["assignments"] = []
        return out

    async def teacher_class_view(doc: dict):
        assignments = await db.assignments.find(
            {"class_code": doc["code"]},
            {"_id": 0},
        ).sort("created_at", -1).to_list(200)

        assignment_rows = []
        for assignment in assignments:
            item = _assignment_card(assignment)
            submitted_ids = await db.assignment_submissions.distinct(
                "player_id",
                {"assignment_code": assignment["code"]},
            )
            roster_ids = {student.get("player_id") for student in doc.get("students", [])}
            completed_roster = len([pid for pid in submitted_ids if pid in roster_ids])
            item["completed_students"] = completed_roster
            item["roster_students"] = len(roster_ids)
            assignment_rows.append(item)

        return {
            "code": doc["code"],
            "name": doc["name"],
            "year_level": doc.get("year_level"),
            "teacher_name": doc.get("teacher_name", "Teacher"),
            "created_at": doc.get("created_at"),
            "archived": bool(doc.get("archived", False)),
            "students": doc.get("students", []),
            "student_count": len(doc.get("students", [])),
            "assignments": assignment_rows,
            "assignment_count": len(assignment_rows),
            "active_assignment_count": sum(1 for item in assignment_rows if item.get("status") == "active"),
        }

    @api_router.post("/teacher/classes")
    async def create_class(
        body: ClassCreateBody,
        user: dict = Depends(get_current_user),
    ):
        await require_teacher_account(user)
        code = await next_unique_code()
        now = _iso()
        doc = {
            "code": code,
            "teacher_id": str(user["_id"]),
            "teacher_name": public_user(user)["name"],
            "name": body.name.strip()[:80],
            "year_level": (body.year_level or "").strip()[:40] or None,
            "students": [],
            "archived": False,
            "created_at": now,
            "updated_at": now,
        }
        await db.school_classes.insert_one(doc)
        return await teacher_class_view(doc)

    @api_router.get("/teacher/classes")
    async def list_teacher_classes(user: dict = Depends(get_current_user)):
        await require_teacher_account(user)
        rows = await db.school_classes.find(
            {"teacher_id": str(user["_id"])},
            {"_id": 0},
        ).sort([("archived", 1), ("created_at", -1)]).to_list(200)

        classes = []
        for row in rows:
            assignment_count = await db.assignments.count_documents({"class_code": row["code"]})
            active_assignment_count = await db.assignments.count_documents({
                "class_code": row["code"],
                "status": "active",
            })
            classes.append({
                "code": row["code"],
                "name": row["name"],
                "year_level": row.get("year_level"),
                "teacher_name": row.get("teacher_name", "Teacher"),
                "student_count": len(row.get("students", [])),
                "assignment_count": assignment_count,
                "active_assignment_count": active_assignment_count,
                "archived": bool(row.get("archived", False)),
                "created_at": row.get("created_at"),
            })
        return {"classes": classes}

    @api_router.get("/teacher/classes/{code}")
    async def get_teacher_class(
        code: str,
        user: dict = Depends(get_current_user),
    ):
        doc = await require_class_teacher(code, user)
        return await teacher_class_view(doc)

    @api_router.post("/teacher/classes/{code}/archive")
    async def archive_teacher_class(
        code: str,
        body: ClassArchiveBody,
        user: dict = Depends(get_current_user),
    ):
        doc = await require_class_teacher(code, user)
        await db.school_classes.update_one(
            {"code": doc["code"]},
            {"$set": {"archived": bool(body.archived), "updated_at": _iso()}},
        )
        doc = await class_or_404(code)
        return await teacher_class_view(doc)

    @api_router.delete("/teacher/classes/{code}/students/{player_id}")
    async def remove_class_student(
        code: str,
        player_id: str,
        user: dict = Depends(get_current_user),
    ):
        doc = await require_class_teacher(code, user)
        await db.school_classes.update_one(
            {"code": doc["code"]},
            {
                "$pull": {"students": {"player_id": player_id}},
                "$set": {"updated_at": _iso()},
            },
        )
        doc = await class_or_404(code)
        return await teacher_class_view(doc)

    @api_router.post("/teacher/classes/{code}/assignments")
    async def create_class_assignment(
        code: str,
        body: ClassAssignmentBody,
        user: dict = Depends(get_current_user),
    ):
        doc = await require_class_teacher(code, user)
        if doc.get("archived"):
            raise HTTPException(status_code=400, detail="Reopen this class before assigning new work")

        words = _clean_words(body.words)
        due = _parse_due(body.due_at)
        assignment_code = await next_unique_code()
        now = _iso()
        assignment = {
            "code": assignment_code,
            "teacher_id": str(user["_id"]),
            "teacher_name": public_user(user)["name"],
            "title": body.title.strip()[:80],
            "words": words,
            "level": body.level.strip()[:32] or "custom",
            "attempts_allowed": int(body.attempts_allowed),
            "due_at": due.isoformat() if due else None,
            "status": "active",
            "class_code": doc["code"],
            "class_name": doc["name"],
            "created_at": now,
            "updated_at": now,
        }
        await db.assignments.insert_one(assignment)
        return _assignment_card(assignment)

    @api_router.get("/teacher/classes/{code}/analytics")
    async def class_analytics(
        code: str,
        user: dict = Depends(get_current_user),
    ):
        doc = await require_class_teacher(code, user)
        roster = doc.get("students", [])
        roster_ids = {student.get("player_id") for student in roster}
        assignments = await db.assignments.find(
            {"class_code": doc["code"]},
            {"_id": 0},
        ).to_list(500)
        assignment_codes = [row["code"] for row in assignments]
        submissions = []
        if assignment_codes:
            submissions = await db.assignment_submissions.find(
                {"assignment_code": {"$in": assignment_codes}},
                {"_id": 0},
            ).to_list(5000)

        best = {}
        for row in submissions:
            if row.get("player_id") not in roster_ids:
                continue
            key = (row.get("assignment_code"), row.get("player_id"))
            current = best.get(key)
            if (
                not current
                or row.get("accuracy", 0) > current.get("accuracy", 0)
                or (
                    row.get("accuracy", 0) == current.get("accuracy", 0)
                    and row.get("avg_time_ms", 10**12) < current.get("avg_time_ms", 10**12)
                )
            ):
                best[key] = row

        best_rows = list(best.values())
        overall_accuracy = round(
            sum(row.get("accuracy", 0) for row in best_rows) / len(best_rows)
        ) if best_rows else 0
        average_time_ms = round(
            sum(row.get("avg_time_ms", 0) for row in best_rows) / len(best_rows)
        ) if best_rows else 0

        missed_counts = {}
        for row in best_rows:
            for missed in row.get("missed", []):
                word = (missed.get("word") or "").strip()
                if word:
                    missed_counts[word] = missed_counts.get(word, 0) + 1
        top_missed = [
            {"word": word, "misses": count}
            for word, count in sorted(missed_counts.items(), key=lambda item: (-item[1], item[0].casefold()))[:12]
        ]

        students = []
        for student in roster:
            pid = student.get("player_id")
            rows = [row for row in best_rows if row.get("player_id") == pid]
            students.append({
                "player_id": pid,
                "name": student.get("name"),
                "registered": bool(student.get("registered")),
                "completed": len(rows),
                "assigned": len(assignments),
                "accuracy": round(sum(row.get("accuracy", 0) for row in rows) / len(rows)) if rows else None,
                "avg_time_ms": round(sum(row.get("avg_time_ms", 0) for row in rows) / len(rows)) if rows else None,
            })

        return {
            "class": {
                "code": doc["code"],
                "name": doc["name"],
                "year_level": doc.get("year_level"),
            },
            "summary": {
                "students": len(roster),
                "assignments": len(assignments),
                "completions": len(best_rows),
                "possible_completions": len(roster) * len(assignments),
                "average_accuracy": overall_accuracy,
                "average_time_ms": average_time_ms,
            },
            "top_missed_words": top_missed,
            "students": students,
        }

    @api_router.get("/classes/{code}")
    async def get_public_class(
        code: str,
        player_id: Optional[str] = None,
        user: Optional[dict] = Depends(get_optional_user),
    ):
        if user:
            await require_student_account(user)
        doc = await class_or_404(code)
        pid = str(user["_id"]) if user else player_id
        return await public_class_view(doc, pid)

    @api_router.post("/classes/{code}/join")
    async def join_class(
        code: str,
        body: ClassJoinBody,
        user: Optional[dict] = Depends(get_optional_user),
    ):
        if user:
            await require_student_account(user)
        doc = await class_or_404(code)
        if doc.get("archived"):
            raise HTTPException(status_code=400, detail="This class is archived")

        pid = str(user["_id"]) if user else body.player_id
        name = (public_user(user)["name"] if user else body.name).strip()[:24]
        existing = student_member(doc, pid)

        if existing:
            await db.school_classes.update_one(
                {"code": doc["code"], "students.player_id": pid},
                {
                    "$set": {
                        "students.$.name": name,
                        "students.$.registered": bool(user),
                        "updated_at": _iso(),
                    }
                },
            )
        else:
            if len(doc.get("students", [])) >= 100:
                raise HTTPException(status_code=400, detail="This class roster is full")
            await db.school_classes.update_one(
                {"code": doc["code"]},
                {
                    "$push": {
                        "students": {
                            "player_id": pid,
                            "name": name,
                            "registered": bool(user),
                            "joined_at": _iso(),
                        }
                    },
                    "$set": {"updated_at": _iso()},
                },
            )

        doc = await class_or_404(code)
        return await public_class_view(doc, pid)

    @api_router.get("/my/classes")
    async def my_classes(user: dict = Depends(get_current_user)):
        await require_student_account(user)
        pid = str(user["_id"])
        rows = await db.school_classes.find(
            {"students.player_id": pid, "archived": {"$ne": True}},
            {"_id": 0},
        ).sort("updated_at", -1).to_list(100)
        classes = []
        for row in rows:
            view = await public_class_view(row, pid)
            classes.append(view)
        return {"classes": classes}

    from classroom_report_api import register_classroom_report_routes

    register_classroom_report_routes(
        api_router=api_router,
        db=db,
        get_current_user=get_current_user,
        require_teacher_account=require_teacher_account,
    )
