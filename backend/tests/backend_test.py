"""Backend API tests for Spelling Bee — scores, leaderboards, auth, daily, rooms."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    # fallback: read frontend/.env
    with open('/app/frontend/.env') as f:
        for ln in f:
            if ln.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = ln.split('=', 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip('/')
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@spellbee.app"
DEMO_PASSWORD = "SpellBee2026"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# ---------- root / health ----------
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


# ---------- Auth ----------
class TestAuth:
    def test_login_demo(self, s):
        r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and "user" in data
        assert data["user"]["email"] == DEMO_EMAIL
        # bcrypt hash format not visible but verify_password worked

    def test_login_invalid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "nope@nope.com", "password": "wrongwrong"})
        assert r.status_code == 401

    def test_me_without_auth(self, s):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, s):
        r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        token = r.json()["token"]
        r2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r2.status_code == 200
        assert r2.json()["user"]["email"] == DEMO_EMAIL

    def test_register_and_duplicate(self, s):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234"})
        assert r.status_code == 200
        r2 = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234"})
        assert r2.status_code == 400


# ---------- Scores ----------
class TestScores:
    def _valid_payload(self):
        return {
            "player_id": f"test-{uuid.uuid4().hex[:8]}",
            "name": "TESTPlayer",
            "mode": "ten",
            "difficulty": "easy",
            "correct": 8,
            "total": 10,
            "points": 800,
            "best_streak": 5,
            "avg_time_ms": 3000,
            "duration_ms": 30000,
            "mastered": 2,
        }

    def test_submit_valid(self, s):
        r = s.post(f"{API}/scores", json=self._valid_payload())
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["entry"]["accuracy"] == 80

    def test_correct_gt_total_400(self, s):
        p = self._valid_payload()
        p["correct"] = 11
        r = s.post(f"{API}/scores", json=p)
        assert r.status_code == 400

    def test_zero_total_rejected(self, s):
        p = self._valid_payload()
        p["total"] = 0
        r = s.post(f"{API}/scores", json=p)
        assert r.status_code == 422  # pydantic ge=1

    def test_impossible_speed_rejected(self, s):
        p = self._valid_payload()
        p["avg_time_ms"] = 100
        r = s.post(f"{API}/scores", json=p)
        assert r.status_code == 400


# ---------- Leaderboards ----------
class TestLeaderboards:
    def test_weekly_score(self, s):
        r = s.get(f"{API}/leaderboards", params={"period": "weekly", "metric": "score"})
        assert r.status_code == 200
        data = r.json()
        assert data["period"] == "weekly"
        assert data["metric"] == "score"
        assert isinstance(data["entries"], list)

    def test_invalid_metric_400(self, s):
        r = s.get(f"{API}/leaderboards", params={"period": "weekly", "metric": "bogus"})
        assert r.status_code == 400

    def test_invalid_period_400(self, s):
        r = s.get(f"{API}/leaderboards", params={"period": "yearly", "metric": "score"})
        assert r.status_code == 400

    def test_all_periods_metrics(self, s):
        for period in ["daily", "weekly", "monthly", "all"]:
            for metric in ["score", "streak", "accuracy", "fastest", "mastered"]:
                r = s.get(f"{API}/leaderboards", params={"period": period, "metric": metric})
                assert r.status_code == 200, f"{period}/{metric} -> {r.status_code}"

    def test_score_appears_in_alltime(self, s):
        pid = f"test-{uuid.uuid4().hex[:8]}"
        payload = {
            "player_id": pid, "name": "TESTLBUser", "mode": "ten", "difficulty": "hard",
            "correct": 10, "total": 10, "points": 3000, "best_streak": 10,
            "avg_time_ms": 2000, "duration_ms": 20000, "mastered": 10,
        }
        r = s.post(f"{API}/scores", json=payload)
        assert r.status_code == 200
        r2 = s.get(f"{API}/leaderboards", params={"period": "all", "metric": "score", "player_id": pid, "limit": 100})
        assert r2.status_code == 200
        entries = r2.json()["entries"]
        found = any(e["player_id"] == pid for e in entries)
        assert found, "posted score not found in all-time leaderboard"


# ---------- Daily ----------
class TestDaily:
    def test_daily_today(self, s):
        r = s.get(f"{API}/daily/today")
        assert r.status_code == 200
        data = r.json()
        assert "date" in data and data["word_count"] == 5

    def test_daily_status_new_player(self, s):
        pid = f"test-{uuid.uuid4().hex[:8]}"
        r = s.get(f"{API}/daily/status", params={"player_id": pid})
        assert r.status_code == 200
        assert r.json()["played"] is False


# ---------- Rooms ----------
class TestRooms:
    def test_create_and_get(self, s):
        pid = f"test-{uuid.uuid4().hex[:8]}"
        r = s.post(f"{API}/rooms", json={"player_id": pid, "name": "Host", "word_count": 10, "difficulty": "easy"})
        assert r.status_code == 200, r.text
        code = r.json()["code"]
        r2 = s.get(f"{API}/rooms/{code}")
        assert r2.status_code == 200
        assert r2.json()["host_id"] == pid

    def test_invalid_word_count(self, s):
        r = s.post(f"{API}/rooms", json={"player_id": "p", "name": "H", "word_count": 7, "difficulty": "easy"})
        assert r.status_code == 400


# ---------- Sync (cloud progress) ----------
class TestSync:
    def _login(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert r.status_code == 200
        return s, r.json()["token"]

    def test_get_sync_without_auth_401(self):
        r = requests.get(f"{API}/sync")
        assert r.status_code == 401

    def test_put_sync_without_auth_401(self):
        r = requests.put(f"{API}/sync", json={"data": {"a": 1}, "updated_at": "2026-01-01T00:00:00Z"})
        assert r.status_code == 401

    def test_put_then_get_roundtrip(self):
        _, token = self._login()
        headers = {"Authorization": f"Bearer {token}"}
        marker = uuid.uuid4().hex[:8]
        payload = {
            "data": {
                "sb.wordstats.v1": {"rhythm": {"attempts": 1, "correct": 1, "marker": marker}},
                "sb.stats.v1": {"sessions": 3, "correct": 10, "total": 12},
            },
            "updated_at": "2026-01-02T12:00:00Z",
        }
        r = requests.put(f"{API}/sync", json=payload, headers=headers)
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True

        r2 = requests.get(f"{API}/sync", headers=headers)
        assert r2.status_code == 200
        data = r2.json()
        assert data["updated_at"] == payload["updated_at"]
        assert data["data"]["sb.wordstats.v1"]["rhythm"]["marker"] == marker


# ---------- Scores tightened validation ----------
class TestScoresDurationValidation:
    def _base(self):
        return {
            "player_id": f"test-{uuid.uuid4().hex[:8]}",
            "name": "TESTDur", "mode": "ten", "difficulty": "easy",
            "correct": 8, "total": 10, "points": 800, "best_streak": 5,
            "avg_time_ms": 2000, "duration_ms": 20000, "mastered": 0,
        }

    def test_duration_too_short_rejected(self, s):
        p = self._base(); p["avg_time_ms"] = 2000; p["duration_ms"] = 1000; p["total"] = 10
        r = s.post(f"{API}/scores", json=p)
        assert r.status_code == 400

    def test_duration_ok_accepted(self, s):
        p = self._base(); p["avg_time_ms"] = 2000; p["duration_ms"] = 20000; p["total"] = 10
        r = s.post(f"{API}/scores", json=p)
        assert r.status_code == 200


# ---------- Multiplayer full flow ----------
class TestMultiplayerFlow:
    def test_full_room_flow(self):
        # Use isolated sessions to avoid the demo cookie leaking (as noted in prev iteration)
        host_s = requests.Session()
        p2_s = requests.Session()
        host_pid = f"test-host-{uuid.uuid4().hex[:6]}"
        p2_pid = f"test-p2-{uuid.uuid4().hex[:6]}"

        # Create room
        r = host_s.post(f"{API}/rooms", json={"player_id": host_pid, "name": "Host", "word_count": 5, "difficulty": "easy"})
        assert r.status_code == 200, r.text
        code = r.json()["code"]
        assert r.json()["host_id"] == host_pid

        # P2 joins
        r = p2_s.post(f"{API}/rooms/{code}/join", json={"player_id": p2_pid, "name": "Player2"})
        assert r.status_code == 200
        assert len(r.json()["players"]) == 2

        # Host starts
        r = host_s.post(f"{API}/rooms/{code}/start", json={"player_id": host_pid})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "running"

        # Both progress 5 words
        for i in range(5):
            r = host_s.post(f"{API}/rooms/{code}/progress", json={"player_id": host_pid, "correct": True, "time_ms": 1500})
            assert r.status_code == 200
            r = p2_s.post(f"{API}/rooms/{code}/progress", json={"player_id": p2_pid, "correct": (i % 2 == 0), "time_ms": 2000})
            assert r.status_code == 200

        # Both finish
        r = host_s.post(f"{API}/rooms/{code}/finish", json={"player_id": host_pid})
        assert r.status_code == 200
        r = p2_s.post(f"{API}/rooms/{code}/finish", json={"player_id": p2_pid})
        assert r.status_code == 200
        assert r.json()["status"] == "finished"

        # GET room and verify players have scores
        r = requests.get(f"{API}/rooms/{code}")
        assert r.status_code == 200
        players = r.json()["players"]
        assert len(players) == 2
        host = next(p for p in players if p["player_id"] == host_pid)
        p2 = next(p for p in players if p["player_id"] == p2_pid)
        assert host["score"] == 5
        assert p2["score"] == 3
        assert host["answered"] == 5 and p2["answered"] == 5
