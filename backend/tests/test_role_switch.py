"""Role switching keeps records in place and does not auto-promote explicit Students."""
import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

from fastapi import APIRouter, HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from teacher_api import AccountTypeBody, register_teacher_routes


class Collection:
    def __init__(self, rows=()):
        self.rows = list(rows)

    async def find_one(self, query, projection=None):
        return next((row.copy() for row in self.rows if all(row.get(k) == v for k, v in query.items())), None)

    async def update_one(self, query, change):
        row = next((row for row in self.rows if all(row.get(k) == v for k, v in query.items())), None)
        if row is not None:
            row.update(change["$set"])
        return SimpleNamespace(modified_count=int(row is not None))


class Database:
    def __init__(self, role=None):
        user = {"_id": "u1", "name": "Alex"}
        if role:
            user["account_type"] = role
        self.users = Collection([user])
        self.assignments = Collection([{"teacher_id": "u1", "code": "ASSIGN"}])
        self.classrooms = Collection([{"host_id": "u1", "code": "ROOM"}])
        self.school_classes = Collection([{"teacher_id": "u1", "students": [{"player_id": "u1"}]}])
        self.assignment_submissions = Collection([{"player_id": "u1", "assignment_code": "ASSIGN"}])
        self.sync = Collection([{"user_id": "u1", "data": {"saved_words": ["bee"]}}])


def routes(db):
    router = APIRouter()
    register_teacher_routes(
        api_router=router, db=db, get_current_user=lambda: None,
        get_optional_user=lambda: None, public_user=lambda user: {"id": user["_id"]},
        new_code=lambda: "NEW", get_classroom_or_404=lambda code: None,
        classroom_view=lambda room, **kwargs: room,
    )
    return {tuple(sorted(route.methods or ())) + (route.path,): route.endpoint for route in router.routes}


def endpoint(all_routes, method, path):
    return next(fn for key, fn in all_routes.items() if method in key[:-1] and key[-1] == path)


def test_switch_preserves_both_workspaces_and_student_access_is_scoped():
    db = Database("teacher")
    all_routes = routes(db)
    switch = endpoint(all_routes, "POST", "/auth/account/type")
    my_classes = endpoint(all_routes, "GET", "/my/classes")
    user = db.users.rows[0]

    async def check():
        try:
            await my_classes(user=user)
            assert False, "Teacher must not access Student classes"
        except HTTPException as exc:
            assert exc.status_code == 403
        result = await switch(AccountTypeBody(account_type="student"), user=user)
        assert result["user"]["account_type"] == "student"
        assert db.assignments.rows[0]["teacher_id"] == "u1"
        assert db.school_classes.rows[0]["students"][0]["player_id"] == "u1"
        assert db.assignment_submissions.rows[0]["player_id"] == "u1"
        assert db.sync.rows[0]["data"]["saved_words"] == ["bee"]
        result = await switch(AccountTypeBody(account_type="teacher"), user=db.users.rows[0])
        assert result["user"]["account_type"] == "teacher"
    asyncio.run(check())


def test_explicit_student_is_not_promoted_by_legacy_teacher_records():
    db = Database("student")
    all_routes = routes(db)
    teacher_classes = endpoint(all_routes, "GET", "/teacher/classes")

    async def check():
        try:
            await teacher_classes(user=db.users.rows[0])
            assert False, "Explicit Student must not inherit Teacher access"
        except HTTPException as exc:
            assert exc.status_code == 403
        assert db.users.rows[0]["account_type"] == "student"
    asyncio.run(check())


def test_legacy_teacher_is_recognized_only_when_role_is_missing():
    db = Database()
    all_routes = routes(db)
    account = endpoint(all_routes, "GET", "/auth/account")
    result = asyncio.run(account(user=db.users.rows[0]))
    assert result["user"]["account_type"] == "teacher"
    assert db.users.rows[0]["account_type"] == "teacher"
