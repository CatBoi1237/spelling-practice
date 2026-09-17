import asyncio
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from test_role_switch import Database, Collection, routes, endpoint
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
        return list({r[key] for r in self.rows if r.get("assignment_code") == query["assignment_code"]})


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
        asyncio.run(handler("CLASS1", ClassChallengeBody(title="Goal", target=5), user=db.users.rows[0]))
    assert error.value.status_code == 403
    assert "challenge" not in db.school_classes.rows[0]


@pytest.mark.parametrize("target", [0, -1, 10001])
def test_invalid_challenge_target(target):
    with pytest.raises(ValidationError):
        ClassChallengeBody(title="Goal", target=target)
