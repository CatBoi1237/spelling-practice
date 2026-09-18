import asyncio
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from .test_role_switch import Database, Collection, routes, endpoint
from class_api import ClassChallengeBody


class Cursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, limit):
        return self.rows[:limit]


class AssignmentCollection(Collection):
    def find(self, query, projection=None):
        return Cursor([r for r in self.rows if r.get("class_code") == query["class_code"] and r.get("status") != "deleted"])


class SubmissionCollection(Collection):
    async def distinct(self, key, query):
        since = query.get("submitted_at", {}).get("$gte", "")
        return list({r[key] for r in self.rows if r.get("assignment_code") == query["assignment_code"] and r.get("submitted_at", "") >= since})


def challenge_db(role):
    db = Database(role)
    db.school_classes = Collection([{"code": "CLASS1", "teacher_id": "u1", "students": [{"player_id": "s1"}, {"player_id": "s2"}]}])
    db.assignments = AssignmentCollection([{"code": "A", "class_code": "CLASS1"}, {"code": "B", "class_code": "CLASS1", "status": "deleted"}])
    db.assignment_submissions = SubmissionCollection([
        {"assignment_code": "A", "player_id": "s1"},
        {"assignment_code": "A", "player_id": "s1"},
        {"assignment_code": "A", "player_id": "outsider"},
        {"assignment_code": "B", "player_id": "s2"},
    ])
    return db


def test_challenge_counts_only_unique_roster_completions_and_retains_records():
    db = challenge_db("teacher")
    handler = endpoint(routes(db), "PUT", "/teacher/classes/{code}/challenge")
    result = asyncio.run(handler("CLASS1", ClassChallengeBody(title="Team goal", target=5), user=db.users.rows[0]))
    assert result == {"title": "Team goal", "target": 5, "completed": 1}
    assert len(db.assignment_submissions.rows) == 4


@pytest.mark.parametrize("role, owner", [("student", "u1"), ("teacher", "other")])
def test_challenge_rejects_wrong_role_and_wrong_owner(role, owner):
    db = challenge_db(role)
    db.school_classes.rows[0]["teacher_id"] = owner
    handler = endpoint(routes(db), "PUT", "/teacher/classes/{code}/challenge")
    with pytest.raises(HTTPException) as error:
        asyncio.run(handler("CLASS1", ClassChallengeBody(title="Goal", target=5, restart=True), user=db.users.rows[0]))
    assert error.value.status_code == 403
    assert "challenge" not in db.school_classes.rows[0]


@pytest.mark.parametrize("target", [0, -1, 10001])
def test_invalid_challenge_target(target):
    with pytest.raises(ValidationError):
        ClassChallengeBody(title="Goal", target=target)


def test_restart_archives_final_count_without_deleting_student_results(monkeypatch):
    monkeypatch.setattr("class_api._iso", lambda: "2026-09-18T12:00:00+00:00")
    db = challenge_db("teacher")
    db.school_classes.rows[0]["challenge"] = {"title": "First goal", "target": 1}
    handler = endpoint(routes(db), "PUT", "/teacher/classes/{code}/challenge")
    result = asyncio.run(handler("CLASS1", ClassChallengeBody(title="New goal", target=5, restart=True), user=db.users.rows[0]))
    assert result["completed"] == 0
    assert result["started_at"] == "2026-09-18T12:00:00+00:00"
    assert result["history"] == [{"title": "First goal", "target": 1, "completed": 1, "ended_at": "2026-09-18T12:00:00+00:00"}]
    assert len(db.assignment_submissions.rows) == 4
    assert len(db.assignments.rows) == 2


def test_edit_preserves_period_and_counts_each_member_once_after_start():
    db = challenge_db("teacher")
    start = "2026-09-18T12:00:00+00:00"
    db.school_classes.rows[0]["challenge"] = {"title": "Fresh goal", "target": 5, "started_at": start}
    db.school_classes.rows[0]["challenge_history"] = [{"title": "Previous", "target": 1, "completed": 1}]
    db.assignment_submissions.rows += [
        {"assignment_code": "A", "player_id": "s2", "submitted_at": "2026-09-18T11:59:59+00:00"},
        {"assignment_code": "A", "player_id": "s1", "submitted_at": start},
        {"assignment_code": "A", "player_id": "s1", "submitted_at": "2026-09-18T12:01:00+00:00"},
        {"assignment_code": "A", "player_id": "outsider", "submitted_at": start},
    ]
    handler = endpoint(routes(db), "PUT", "/teacher/classes/{code}/challenge")
    result = asyncio.run(handler("CLASS1", ClassChallengeBody(title="Renamed", target=10), user=db.users.rows[0]))
    assert result["completed"] == 1
    assert result["started_at"] == start
    assert result["title"] == "Renamed"
    assert len(result["history"]) == 1


def test_repeated_restart_keeps_all_archived_goals_without_nested_history(monkeypatch):
    monkeypatch.setattr("class_api._iso", lambda: "2026-09-18T12:00:00+00:00")
    db = challenge_db("teacher")
    db.school_classes.rows[0]["challenge"] = {"title": "First", "target": 1}
    handler = endpoint(routes(db), "PUT", "/teacher/classes/{code}/challenge")
    for title in ["Second", "Third"]:
        result = asyncio.run(handler("CLASS1", ClassChallengeBody(title=title, target=5, restart=True), user=db.users.rows[0]))
    assert [goal["title"] for goal in result["history"]] == ["First", "Second"]
    assert all("history" not in goal for goal in result["history"])
