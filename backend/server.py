from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import json
import hashlib
import secrets
import asyncio
import requests
import jwt
import bcrypt
import random
import string
import logging
from datetime import datetime, timezone, timedelta, date as date_cls
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
EPOCH = date_cls(2026, 1, 1)
DAILY_WORD_COUNT = 5

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------------- auth helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, auth_version: int = 1) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
        "ver": auth_version,
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="lax", max_age=604800, path="/",
    )


def extract_token(request: Request) -> Optional[str]:
    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    return token or None


def public_user(user: dict) -> dict:
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name") or user["email"].split("@")[0]}


async def get_optional_user(request: Request) -> Optional[dict]:
    token = extract_token(request)
    if not token:
        return None
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            return None
        if payload.get("ver", 1) != user.get("auth_version", 1):
            return None
        return user
    except (jwt.InvalidTokenError, Exception):
        return None


async def get_current_user(request: Request) -> dict:
    user = await get_optional_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ---------------- models ----------------
class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordBody(BaseModel):
    email: EmailStr


class ResetPasswordBody(BaseModel):
    token: str = Field(min_length=20)
    password: str = Field(min_length=6)


class DailySubmitBody(BaseModel):
    player_id: str
    name: str = Field(min_length=1, max_length=24)
    date: str
    results: List[bool]
    time_ms: int = 0


class RoomCreateBody(BaseModel):
    player_id: str
    name: str = Field(min_length=1, max_length=24)
    word_count: int = 10
    difficulty: str = "medium"


class RoomJoinBody(BaseModel):
    player_id: str
    name: str = Field(min_length=1, max_length=24)


class RoomProgressBody(BaseModel):
    player_id: str
    correct: bool
    time_ms: int = 0


class RoomActionBody(BaseModel):
    player_id: str


class ReadyBody(BaseModel):
    player_id: str
    ready: bool


class ClassroomCreateBody(BaseModel):
    word_count: int = 10
    difficulty: str = "medium"
    time_limit_sec: int = Field(default=20, ge=10, le=60)


class ClassroomJoinBody(BaseModel):
    player_id: str
    name: str = Field(min_length=1, max_length=24)


class ClassroomRoundBody(BaseModel):
    word: str = Field(min_length=1, max_length=80)


class ClassroomSubmitBody(BaseModel):
    player_id: str
    answer: str = Field(default="", max_length=100)


# ---------------- auth routes ----------------
@api_router.post("/auth/register")
async def register(body: RegisterBody, response: Response):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": (body.name or email.split("@")[0]).strip()[:24],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "auth_version": 1,
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = create_access_token(str(res.inserted_id), email, doc.get("auth_version", 1))
    set_auth_cookie(response, token)
    return {"user": public_user(doc), "token": token}


@api_router.post("/auth/login")
async def login(body: LoginBody, request: Request, response: Response):
    email = body.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    now = datetime.now(timezone.utc)

    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = datetime.fromisoformat(attempt["last_at"]) + timedelta(minutes=15)
        if now < locked_until:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"last_at": now.isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    token = create_access_token(str(user["_id"]), email, user.get("auth_version", 1))
    set_auth_cookie(response, token)
    return {"user": public_user(user), "token": token}


async def send_password_reset_email(email: str, reset_url: str) -> None:
    api_key = os.environ.get("RESEND_API_KEY")
    from_email = os.environ.get("RESET_FROM_EMAIL")

    if not api_key or not from_email:
        raise RuntimeError("Password reset email configuration is missing")

    payload = {
        "from": f"SpellBee <{from_email}>",
        "to": [email],
        "subject": "Reset your SpellBee password",
        "html": f"""
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#172033">
          <h1 style="margin-bottom:8px;">Reset your SpellBee password 🐝</h1>
          <p>We received a request to reset the password for your SpellBee account.</p>

          <p style="margin:30px 0;">
            <a href="{reset_url}"
               style="background:#f59e0b;color:#111827;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:bold;">
               Reset password
            </a>
          </p>

          <p>This link expires in 30 minutes and can only be used once.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>

          <hr style="border:none;border-top:1px solid #ddd;margin:28px 0;" />
          <p style="font-size:12px;color:#687386;">
            SpellBee · https://spellbee.dpdns.org
          </p>
        </div>
        """,
        "text": f"""Reset your SpellBee password

Open this link:
{reset_url}

This link expires in 30 minutes and can only be used once.

If you did not request this, you can ignore this email.
""",
    }

    def send():
        result = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        result.raise_for_status()

    await asyncio.to_thread(send)


@api_router.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordBody):
    email = body.email.lower().strip()

    # Always return the same response so people cannot discover
    # which email addresses have SpellBee accounts.
    message = {
        "message": "If an account exists for that email, a password reset link has been sent."
    }

    user = await db.users.find_one({"email": email})
    if not user:
        return message

    now = datetime.now(timezone.utc)

    # Prevent repeatedly emailing the same account.
    recent = await db.password_reset_rate.find_one({
        "email": email,
        "last_at": {"$gt": now - timedelta(seconds=60)},
    })

    if recent:
        return message

    await db.password_reset_rate.update_one(
        {"email": email},
        {"$set": {"last_at": now}},
        upsert=True,
    )

    # Invalidate any older unused reset links.
    await db.password_reset_tokens.delete_many({
        "user_id": str(user["_id"]),
        "used": False,
    })

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    await db.password_reset_tokens.insert_one({
        "token_hash": token_hash,
        "user_id": str(user["_id"]),
        "email": email,
        "created_at": now,
        "expires_at": now + timedelta(minutes=30),
        "used": False,
    })

    app_url = os.environ.get("APP_URL", "https://spellbee.dpdns.org").rstrip("/")
    reset_url = f"{app_url}/reset-password?token={raw_token}"

    try:
        await send_password_reset_email(email, reset_url)
    except Exception:
        logger.exception("Failed to send password reset email")
        await db.password_reset_tokens.delete_one({"token_hash": token_hash})

    return message


@api_router.post("/auth/reset-password")
async def reset_password(body: ResetPasswordBody, response: Response):
    token_hash = hashlib.sha256(body.token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)

    reset = await db.password_reset_tokens.find_one({
        "token_hash": token_hash,
        "used": False,
        "expires_at": {"$gt": now},
    })

    if not reset:
        raise HTTPException(
            status_code=400,
            detail="This password reset link is invalid or has expired.",
        )

    # Atomically claim the token so it cannot be used twice.
    claimed = await db.password_reset_tokens.update_one(
        {
            "_id": reset["_id"],
            "used": False,
            "expires_at": {"$gt": now},
        },
        {
            "$set": {
                "used": True,
                "used_at": now,
            }
        },
    )

    if claimed.modified_count != 1:
        raise HTTPException(
            status_code=400,
            detail="This password reset link has already been used.",
        )

    user = await db.users.find_one({"_id": ObjectId(reset["user_id"])})
    if not user:
        raise HTTPException(status_code=400, detail="Account not found.")

    new_auth_version = user.get("auth_version", 1) + 1

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": hash_password(body.password),
                "auth_version": new_auth_version,
                "password_changed_at": now,
            }
        },
    )

    # Remove any other reset links for this account.
    await db.password_reset_tokens.delete_many({
        "user_id": str(user["_id"]),
        "used": False,
    })

    # Log the browser out if it currently has an old session cookie.
    response.delete_cookie("access_token", path="/")

    return {"message": "Your password has been reset successfully."}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


# ---------------- daily challenge ----------------
def today_utc() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def puzzle_number(date_str: str) -> int:
    return (date_cls.fromisoformat(date_str) - EPOCH).days + 1


def daily_seed(date_str: str) -> int:
    h = 2166136261
    for ch in date_str:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


@api_router.get("/daily/today")
async def daily_today():
    d = today_utc()
    return {
        "date": d,
        "puzzle_number": puzzle_number(d),
        "seed": daily_seed(d),
        "word_count": DAILY_WORD_COUNT,
    }


def compute_streak(dates: List[str], today: str) -> int:
    s = set(dates)
    cursor = date_cls.fromisoformat(today)
    if cursor.isoformat() not in s:
        cursor = cursor - timedelta(days=1)
        if cursor.isoformat() not in s:
            return 0
    streak = 0
    while cursor.isoformat() in s:
        streak += 1
        cursor = cursor - timedelta(days=1)
    return streak


@api_router.get("/daily/status")
async def daily_status(player_id: str, date: Optional[str] = None, user: Optional[dict] = Depends(get_optional_user)):
    d = date or today_utc()
    pid = str(user["_id"]) if user else player_id
    entry = await db.daily_results.find_one({"player_id": pid, "date": d}, {"_id": 0})
    rows = await db.daily_results.find({"player_id": pid}, {"_id": 0, "date": 1}).to_list(400)
    return {
        "date": d,
        "puzzle_number": puzzle_number(d),
        "played": entry is not None,
        "entry": entry,
        "streak": compute_streak([r["date"] for r in rows], today_utc()),
    }


@api_router.post("/daily/submit")
async def daily_submit(body: DailySubmitBody, user: Optional[dict] = Depends(get_optional_user)):
    d = today_utc()
    if body.date != d:
        raise HTTPException(status_code=400, detail="This challenge has expired. Refresh for today's puzzle.")
    if len(body.results) != DAILY_WORD_COUNT:
        raise HTTPException(status_code=400, detail="Invalid submission")

    pid = str(user["_id"]) if user else body.player_id
    name = (public_user(user)["name"] if user else body.name).strip()[:24]

    existing = await db.daily_results.find_one({"player_id": pid, "date": d}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="You have already played today's challenge")

    doc = {
        "player_id": pid,
        "user_id": str(user["_id"]) if user else None,
        "name": name,
        "date": d,
        "puzzle_number": puzzle_number(d),
        "results": body.results,
        "score": sum(1 for r in body.results if r),
        "total": DAILY_WORD_COUNT,
        "time_ms": max(0, body.time_ms),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.daily_results.insert_one(doc)
    doc.pop("_id", None)

    rows = await db.daily_results.find({"player_id": pid}, {"_id": 0, "date": 1}).to_list(400)
    streak = compute_streak([r["date"] for r in rows], d)
    await db.daily_results.update_one({"player_id": pid, "date": d}, {"$set": {"streak": streak}})
    doc["streak"] = streak

    rank_ahead = await db.daily_results.count_documents({
        "date": d,
        "$or": [
            {"score": {"$gt": doc["score"]}},
            {"score": doc["score"], "time_ms": {"$lt": doc["time_ms"]}},
        ],
    })
    total_players = await db.daily_results.count_documents({"date": d})
    return {"entry": doc, "rank": rank_ahead + 1, "total_players": total_players}


@api_router.get("/daily/leaderboard")
async def daily_leaderboard(date: Optional[str] = None, limit: int = 50):
    d = date or today_utc()
    rows = await db.daily_results.find(
        {"date": d}, {"_id": 0, "player_id": 1, "name": 1, "score": 1, "total": 1, "time_ms": 1, "streak": 1, "user_id": 1}
    ).sort([("score", -1), ("time_ms", 1)]).to_list(max(1, min(limit, 100)))
    for i, r in enumerate(rows):
        r["rank"] = i + 1
        r["registered"] = bool(r.pop("user_id", None))
    return {"date": d, "puzzle_number": puzzle_number(d), "entries": rows}


# ---------------- multiplayer rooms ----------------
def new_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choice(alphabet) for _ in range(6))


def sanitize_room(room: dict) -> dict:
    players = sorted(
        room.get("players", []),
        key=lambda p: (-p.get("score", 0), p.get("answered", 0) and -p.get("answered", 0), p.get("total_time_ms", 0)),
    )
    return {
        "code": room["code"],
        "seed": room["seed"],
        "word_count": room["word_count"],
        "difficulty": room["difficulty"],
        "status": room["status"],
        "host_id": room["host_id"],
        "created_at": room["created_at"],
        "started_at": room.get("started_at"),
        "players": players,
    }


@api_router.post("/rooms")
async def create_room(body: RoomCreateBody, user: Optional[dict] = Depends(get_optional_user)):
    if body.word_count not in (5, 10, 15, 25):
        raise HTTPException(status_code=400, detail="word_count must be 5, 10, 15 or 25")
    if body.difficulty not in ("easy", "medium", "hard", "extreme", "mixed"):
        raise HTTPException(status_code=400, detail="Invalid difficulty")

    pid = str(user["_id"]) if user else body.player_id
    name = (public_user(user)["name"] if user else body.name).strip()[:24]

    code = new_code()
    while await db.rooms.find_one({"code": code}):
        code = new_code()

    room = {
        "code": code,
        "seed": random.randint(1, 2_000_000_000),
        "word_count": body.word_count,
        "difficulty": body.difficulty,
        "status": "lobby",
        "host_id": pid,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "started_at": None,
        "players": [{
            "player_id": pid, "name": name, "registered": bool(user),
            "score": 0, "answered": 0, "total_time_ms": 0, "done": False, "finished_at": None,
            "ready": False,
        }],
    }
    await db.rooms.insert_one(room)
    room.pop("_id", None)
    return sanitize_room(room)


@api_router.get("/rooms/{code}")
async def get_room(code: str):
    room = await db.rooms.find_one({"code": code.upper()}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return sanitize_room(room)


@api_router.post("/rooms/{code}/join")
async def join_room(code: str, body: RoomJoinBody, user: Optional[dict] = Depends(get_optional_user)):
    code = code.upper()
    room = await db.rooms.find_one({"code": code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    pid = str(user["_id"]) if user else body.player_id
    name = (public_user(user)["name"] if user else body.name).strip()[:24]

    if any(p["player_id"] == pid for p in room.get("players", [])):
        await db.rooms.update_one({"code": code, "players.player_id": pid}, {"$set": {"players.$.name": name}})
    else:
        if room["status"] != "lobby":
            raise HTTPException(status_code=400, detail="This race has already started")
        if len(room.get("players", [])) >= 12:
            raise HTTPException(status_code=400, detail="This room is full")
        await db.rooms.update_one({"code": code}, {"$push": {"players": {
            "player_id": pid, "name": name, "registered": bool(user),
            "score": 0, "answered": 0, "total_time_ms": 0, "done": False, "finished_at": None,
            "ready": False,
        }}})

    room = await db.rooms.find_one({"code": code}, {"_id": 0})
    return sanitize_room(room)


@api_router.post("/rooms/{code}/ready")
async def set_room_ready(code: str, body: ReadyBody, user: Optional[dict] = Depends(get_optional_user)):
    code = code.upper()
    room = await db.rooms.find_one({"code": code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.get("status") != "lobby":
        raise HTTPException(status_code=400, detail="Ready status can only change in the lobby")

    pid = str(user["_id"]) if user else body.player_id
    if not any(p["player_id"] == pid for p in room.get("players", [])):
        raise HTTPException(status_code=403, detail="You are not in this room")

    await db.rooms.update_one(
        {"code": code, "players.player_id": pid},
        {"$set": {"players.$.ready": bool(body.ready)}},
    )
    room = await db.rooms.find_one({"code": code}, {"_id": 0})
    return sanitize_room(room)


@api_router.post("/rooms/{code}/start")
async def start_room(code: str, body: RoomActionBody, user: Optional[dict] = Depends(get_optional_user)):
    code = code.upper()
    room = await db.rooms.find_one({"code": code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    pid = str(user["_id"]) if user else body.player_id
    if room["host_id"] != pid:
        raise HTTPException(status_code=403, detail="Only the host can start the race")

    players = room.get("players", [])
    if not players or not all(bool(player.get("ready")) for player in players):
        raise HTTPException(status_code=400, detail="Everyone must be ready before the race can start")

    await db.rooms.update_one({"code": code}, {"$set": {
        "status": "running", "started_at": datetime.now(timezone.utc).isoformat(),
    }})
    room = await db.rooms.find_one({"code": code}, {"_id": 0})
    return sanitize_room(room)


@api_router.post("/rooms/{code}/progress")
async def room_progress(code: str, body: RoomProgressBody, user: Optional[dict] = Depends(get_optional_user)):
    code = code.upper()
    pid = str(user["_id"]) if user else body.player_id
    room = await db.rooms.find_one({"code": code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    player = next((p for p in room.get("players", []) if p["player_id"] == pid), None)
    if not player:
        raise HTTPException(status_code=403, detail="You are not in this room")
    if player.get("answered", 0) >= room["word_count"]:
        return sanitize_room(room)
    await db.rooms.update_one(
        {"code": code, "players.player_id": pid},
        {"$inc": {
            "players.$.score": 1 if body.correct else 0,
            "players.$.answered": 1,
            "players.$.total_time_ms": max(0, body.time_ms),
        }},
    )
    room = await db.rooms.find_one({"code": code}, {"_id": 0})
    return sanitize_room(room)


@api_router.post("/rooms/{code}/finish")
async def room_finish(code: str, body: RoomActionBody, user: Optional[dict] = Depends(get_optional_user)):
    code = code.upper()
    pid = str(user["_id"]) if user else body.player_id
    await db.rooms.update_one(
        {"code": code, "players.player_id": pid},
        {"$set": {"players.$.done": True, "players.$.finished_at": datetime.now(timezone.utc).isoformat()}},
    )
    room = await db.rooms.find_one({"code": code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.get("players") and all(p.get("done") for p in room["players"]):
        await db.rooms.update_one({"code": code}, {"$set": {"status": "finished"}})
        room = await db.rooms.find_one({"code": code}, {"_id": 0})
    room.pop("_id", None)
    return sanitize_room(room)


@api_router.post("/rooms/{code}/rematch")
async def room_rematch(code: str, body: RoomActionBody, user: Optional[dict] = Depends(get_optional_user)):
    code = code.upper()
    room = await db.rooms.find_one({"code": code})

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    pid = str(user["_id"]) if user else body.player_id

    if room["host_id"] != pid:
        raise HTTPException(status_code=403, detail="Only the host can start a rematch")

    if room.get("status") != "finished":
        raise HTTPException(status_code=400, detail="The race must be finished before starting a rematch")

    reset_players = []
    for player in room.get("players", []):
        updated_player = dict(player)
        updated_player.update({
            "score": 0,
            "answered": 0,
            "total_time_ms": 0,
            "done": False,
            "finished_at": None,
            "ready": False,
        })
        reset_players.append(updated_player)

    await db.rooms.update_one(
        {"code": code},
        {"$set": {
            "seed": random.randint(1, 2_000_000_000),
            "status": "lobby",
            "started_at": None,
            "players": reset_players,
        }},
    )

    room = await db.rooms.find_one({"code": code}, {"_id": 0})
    return sanitize_room(room)


# ---------------- classroom mode ----------------

def classroom_points(correct: bool, elapsed_ms: int, time_limit_ms: int) -> int:
    """
    Correct answers score from ~1000 down to 200 based on speed.
    Incorrect answers and answers after the timer receive zero.
    """
    if not correct:
        return 0

    if elapsed_ms > time_limit_ms:
        return 0

    progress = min(max(elapsed_ms / max(time_limit_ms, 1), 0), 1)
    return max(200, round(1000 - (progress * 800)))


def classroom_view(room: dict, viewer_id: Optional[str] = None, host_view: bool = False) -> dict:
    round_index = room.get("round_index", -1)
    revealed = bool(room.get("revealed", False))

    students = []
    my_student = None

    for student in room.get("students", []):
        answered = student.get("answered_round", -1) == round_index

        item = {
            "player_id": student["player_id"],
            "name": student["name"],
            "registered": bool(student.get("registered")),
            "total_points": student.get("total_points", 0),
            "answered": answered,
            "ready": bool(student.get("ready", False)),
        }

        # Only reveal round result details after the teacher reveals the word.
        if revealed and answered:
            item["round_correct"] = bool(student.get("last_correct"))
            item["round_points"] = int(student.get("last_points", 0))

        students.append(item)

        if student["player_id"] == viewer_id:
            my_student = student

    answered_count = sum(
        1
        for student in room.get("students", [])
        if student.get("answered_round", -1) == round_index
    )
    ready_count = sum(
        1
        for student in room.get("students", [])
        if bool(student.get("ready", False))
    )

    if host_view:
        role = "host"
    elif my_student:
        role = "student"
    else:
        role = "spectator"

    out = {
        "code": room["code"],
        "role": role,
        "host_name": room.get("host_name", "Teacher"),
        "word_count": room["word_count"],
        "difficulty": room["difficulty"],
        "time_limit_ms": room["time_limit_ms"],
        "status": room["status"],
        "round_index": round_index,
        "round_started_at": room.get("round_started_at"),
        "revealed": revealed,
        "answered_count": answered_count,
        "ready_count": ready_count,
        "created_at": room["created_at"],
        "students": students,
    }

    # SECURITY:
    # Only the teacher receives the seed and current unrevealed word.
    if host_view:
        out["seed"] = room["seed"]
        out["current_word"] = room.get("current_word")

    # Everyone may receive the answer only after Reveal.
    if revealed and room.get("current_word"):
        out["correct_word"] = room["current_word"]

    if my_student:
        submitted = my_student.get("answered_round", -1) == round_index

        out["my_submission"] = {
            "submitted": submitted,
        }

        if revealed and submitted:
            out["my_submission"].update({
                "answer": my_student.get("last_answer", ""),
                "correct": bool(my_student.get("last_correct")),
                "points": int(my_student.get("last_points", 0)),
                "total_points": int(my_student.get("total_points", 0)),
            })

    return out


async def get_classroom_or_404(code: str) -> dict:
    room = await db.classrooms.find_one({"code": code.upper()})
    if not room:
        raise HTTPException(status_code=404, detail="Classroom not found")
    return room


def classroom_host_id(user: dict) -> str:
    return str(user["_id"])


@api_router.post("/classrooms")
async def create_classroom(
    body: ClassroomCreateBody,
    user: dict = Depends(get_current_user),
):
    if body.word_count not in (5, 10, 15, 25):
        raise HTTPException(
            status_code=400,
            detail="word_count must be 5, 10, 15 or 25",
        )

    if body.difficulty not in ("easy", "medium", "hard", "extreme", "mixed"):
        raise HTTPException(status_code=400, detail="Invalid difficulty")

    code = new_code()

    while await db.classrooms.find_one({"code": code}):
        code = new_code()

    room = {
        "code": code,
        "host_id": classroom_host_id(user),
        "host_name": public_user(user)["name"],
        "seed": random.randint(1, 2_000_000_000),
        "word_count": body.word_count,
        "difficulty": body.difficulty,
        "time_limit_ms": body.time_limit_sec * 1000,
        "status": "lobby",
        "round_index": -1,
        "round_started_at": None,
        "current_word": None,
        "revealed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "started_at": None,
        "students": [],
    }

    await db.classrooms.insert_one(room)

    return classroom_view(
        room,
        viewer_id=classroom_host_id(user),
        host_view=True,
    )


@api_router.get("/classrooms/{code}")
async def get_classroom(
    code: str,
    player_id: Optional[str] = None,
    user: Optional[dict] = Depends(get_optional_user),
):
    room = await get_classroom_or_404(code)

    uid = str(user["_id"]) if user else None
    viewer_id = uid or player_id

    host_view = bool(uid and room["host_id"] == uid)

    return classroom_view(
        room,
        viewer_id=viewer_id,
        host_view=host_view,
    )


@api_router.post("/classrooms/{code}/join")
async def join_classroom(
    code: str,
    body: ClassroomJoinBody,
    user: Optional[dict] = Depends(get_optional_user),
):
    code = code.upper()
    room = await get_classroom_or_404(code)

    if room["status"] != "lobby":
        raise HTTPException(
            status_code=400,
            detail="This classroom game has already started",
        )

    pid = str(user["_id"]) if user else body.player_id

    # Teacher is not also inserted as a student.
    if pid == room["host_id"]:
        return classroom_view(room, viewer_id=pid, host_view=True)

    name = (
        public_user(user)["name"]
        if user
        else body.name
    ).strip()[:24]

    existing = next(
        (student for student in room.get("students", [])
         if student["player_id"] == pid),
        None,
    )

    if existing:
        await db.classrooms.update_one(
            {"code": code, "students.player_id": pid},
            {"$set": {"students.$.name": name}},
        )
    else:
        if len(room.get("students", [])) >= 50:
            raise HTTPException(
                status_code=400,
                detail="This classroom is full",
            )

        await db.classrooms.update_one(
            {"code": code},
            {
                "$push": {
                    "students": {
                        "player_id": pid,
                        "name": name,
                        "registered": bool(user),
                        "total_points": 0,
                        "answered_round": -1,
                        "last_answer": None,
                        "last_correct": None,
                        "last_points": 0,
                        "ready": False,
                    }
                }
            },
        )

    room = await get_classroom_or_404(code)

    return classroom_view(
        room,
        viewer_id=pid,
        host_view=False,
    )


@api_router.post("/classrooms/{code}/ready")
async def set_classroom_ready(
    code: str,
    body: ReadyBody,
    user: Optional[dict] = Depends(get_optional_user),
):
    code = code.upper()
    room = await get_classroom_or_404(code)

    if room.get("status") != "lobby":
        raise HTTPException(
            status_code=400,
            detail="Ready status can only change in the lobby",
        )

    pid = str(user["_id"]) if user else body.player_id
    student = next(
        (student for student in room.get("students", []) if student["player_id"] == pid),
        None,
    )
    if not student:
        raise HTTPException(status_code=403, detail="You are not a student in this classroom")

    await db.classrooms.update_one(
        {"code": code, "students.player_id": pid},
        {"$set": {"students.$.ready": bool(body.ready)}},
    )

    room = await get_classroom_or_404(code)
    return classroom_view(room, viewer_id=pid, host_view=False)


@api_router.post("/classrooms/{code}/round/start")
async def start_classroom_round(
    code: str,
    body: ClassroomRoundBody,
    user: dict = Depends(get_current_user),
):
    code = code.upper()
    room = await get_classroom_or_404(code)

    host_id = classroom_host_id(user)

    if room["host_id"] != host_id:
        raise HTTPException(
            status_code=403,
            detail="Only the teacher can control this classroom",
        )

    if room["status"] == "finished":
        raise HTTPException(
            status_code=400,
            detail="This classroom game has finished",
        )

    if (
        room.get("round_index", -1) >= 0
        and not room.get("revealed", False)
    ):
        raise HTTPException(
            status_code=400,
            detail="Reveal the current word before starting the next round",
        )

    next_index = room.get("round_index", -1) + 1

    if next_index >= room["word_count"]:
        raise HTTPException(
            status_code=400,
            detail="There are no more words",
        )

    if next_index == 0:
        students = room.get("students", [])
        if not students:
            raise HTTPException(status_code=400, detail="At least one student must join before the game can start")
        if not all(bool(student.get("ready")) for student in students):
            raise HTTPException(status_code=400, detail="All students must be ready before the game can start")

    word = body.word.strip()

    if not word:
        raise HTTPException(status_code=400, detail="Word is required")

    students = []

    for student in room.get("students", []):
        student = dict(student)
        student["answered_round"] = -1
        student["last_answer"] = None
        student["last_correct"] = None
        student["last_points"] = 0
        students.append(student)

    now = datetime.now(timezone.utc).isoformat()

    update = {
        "status": "running",
        "round_index": next_index,
        "round_started_at": now,
        "current_word": word,
        "revealed": False,
        "students": students,
    }

    if not room.get("started_at"):
        update["started_at"] = now

    await db.classrooms.update_one(
        {"code": code},
        {"$set": update},
    )

    room = await get_classroom_or_404(code)

    return classroom_view(
        room,
        viewer_id=host_id,
        host_view=True,
    )


@api_router.post("/classrooms/{code}/submit")
async def submit_classroom_answer(
    code: str,
    body: ClassroomSubmitBody,
    user: Optional[dict] = Depends(get_optional_user),
):
    code = code.upper()
    room = await get_classroom_or_404(code)

    if room["status"] != "running":
        raise HTTPException(
            status_code=400,
            detail="There is no active classroom round",
        )

    if room.get("revealed"):
        raise HTTPException(
            status_code=400,
            detail="This word has already been revealed",
        )

    pid = str(user["_id"]) if user else body.player_id

    student = next(
        (student for student in room.get("students", [])
         if student["player_id"] == pid),
        None,
    )

    if not student:
        raise HTTPException(
            status_code=403,
            detail="You are not a student in this classroom",
        )

    round_index = room["round_index"]

    # A student may submit only once for each word.
    if student.get("answered_round", -1) == round_index:
        return classroom_view(
            room,
            viewer_id=pid,
            host_view=False,
        )

    started_at = datetime.fromisoformat(room["round_started_at"])
    now = datetime.now(timezone.utc)

    elapsed_ms = max(
        0,
        int((now - started_at).total_seconds() * 1000),
    )

    time_limit_ms = room["time_limit_ms"]

    typed = body.answer.strip()
    expected = (room.get("current_word") or "").strip()

    within_time = elapsed_ms <= time_limit_ms

    correct = (
        within_time
        and typed.casefold() == expected.casefold()
    )

    points = classroom_points(
        correct,
        elapsed_ms,
        time_limit_ms,
    )

    await db.classrooms.update_one(
        {
            "code": code,
            "students.player_id": pid,
        },
        {
            "$set": {
                "students.$.answered_round": round_index,
                "students.$.last_answer": typed,
                "students.$.last_correct": correct,
                "students.$.last_points": points,
            },
            "$inc": {
                "students.$.total_points": points,
            },
        },
    )

    room = await get_classroom_or_404(code)

    return classroom_view(
        room,
        viewer_id=pid,
        host_view=False,
    )


@api_router.post("/classrooms/{code}/reveal")
async def reveal_classroom_word(
    code: str,
    user: dict = Depends(get_current_user),
):
    code = code.upper()
    room = await get_classroom_or_404(code)

    host_id = classroom_host_id(user)

    if room["host_id"] != host_id:
        raise HTTPException(
            status_code=403,
            detail="Only the teacher can reveal the word",
        )

    if room.get("round_index", -1) < 0:
        raise HTTPException(
            status_code=400,
            detail="No classroom round has started",
        )

    await db.classrooms.update_one(
        {"code": code},
        {"$set": {"revealed": True}},
    )

    room = await get_classroom_or_404(code)

    return classroom_view(
        room,
        viewer_id=host_id,
        host_view=True,
    )


@api_router.post("/classrooms/{code}/finish")
async def finish_classroom(
    code: str,
    user: dict = Depends(get_current_user),
):
    code = code.upper()
    room = await get_classroom_or_404(code)

    host_id = classroom_host_id(user)

    if room["host_id"] != host_id:
        raise HTTPException(
            status_code=403,
            detail="Only the teacher can finish the game",
        )

    if room.get("round_index") != room["word_count"] - 1:
        raise HTTPException(
            status_code=400,
            detail="There are still words remaining",
        )

    if not room.get("revealed"):
        raise HTTPException(
            status_code=400,
            detail="Reveal the final word first",
        )

    await db.classrooms.update_one(
        {"code": code},
        {
            "$set": {
                "status": "finished",
                "finished_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    room = await get_classroom_or_404(code)

    return classroom_view(
        room,
        viewer_id=host_id,
        host_view=True,
    )


# ---------------- session scores + global leaderboards ----------------
class ScoreBody(BaseModel):
    player_id: str
    name: str = Field(min_length=1, max_length=24)
    mode: str
    difficulty: str
    correct: int = Field(ge=0, le=200)
    total: int = Field(ge=1, le=200)
    points: int = Field(ge=0, le=60000)
    best_streak: int = Field(ge=0, le=200)
    avg_time_ms: int = Field(ge=0)
    duration_ms: int = Field(ge=0)
    mastered: int = Field(ge=0, le=5000)


@api_router.post("/scores")
async def submit_score(body: ScoreBody, user: Optional[dict] = Depends(get_optional_user)):
    if body.correct > body.total or body.points > body.total * 300 or body.best_streak > body.total:
        raise HTTPException(status_code=400, detail="Invalid score")
    if body.total >= 5 and (body.avg_time_ms < 400 or body.duration_ms < body.avg_time_ms * body.total * 0.5):
        raise HTTPException(status_code=400, detail="Invalid score")
    pid = str(user["_id"]) if user else body.player_id
    name = (public_user(user)["name"] if user else body.name).strip()[:24]
    doc = {
        **body.model_dump(),
        "player_id": pid,
        "name": name,
        "registered": bool(user),
        "accuracy": round(body.correct / body.total * 100),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.scores.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "entry": doc}


PERIOD_DAYS = {"daily": 1, "weekly": 7, "monthly": 30, "all": None}
METRICS = {
    "score": ("points", -1, None),
    "streak": ("best_streak", -1, None),
    "accuracy": ("accuracy", -1, {"total": {"$gte": 10}}),
    "fastest": ("duration_ms", 1, {"mode": "test", "correct": {"$gte": 8}}),
    "mastered": ("mastered", -1, None),
}


@api_router.get("/leaderboards")
async def leaderboards(period: str = "weekly", metric: str = "score", player_id: Optional[str] = None, limit: int = 25):
    if period not in PERIOD_DAYS or metric not in METRICS:
        raise HTTPException(status_code=400, detail="Invalid period or metric")
    field, direction, extra = METRICS[metric]
    match = dict(extra or {})
    days = PERIOD_DAYS[period]
    if days:
        match["created_at"] = {"$gte": (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()}
    pipeline = [
        {"$match": match},
        {"$sort": {field: direction, "created_at": 1}},
        {"$group": {"_id": "$player_id", "name": {"$first": "$name"}, "registered": {"$first": "$registered"}, "value": {"$first": f"${field}"},
                    "mode": {"$first": "$mode"}, "difficulty": {"$first": "$difficulty"}, "accuracy": {"$first": "$accuracy"}, "total": {"$first": "$total"}}},
        {"$sort": {"value": direction, "name": 1}},
        {"$limit": max(1, min(limit, 100))},
    ]
    rows = await db.scores.aggregate(pipeline).to_list(100)
    entries = []
    for i, r in enumerate(rows):
        entries.append({"rank": i + 1, "player_id": r["_id"], "name": r["name"], "registered": bool(r.get("registered")), "value": r["value"],
                        "mode": r.get("mode"), "difficulty": r.get("difficulty"), "accuracy": r.get("accuracy"), "total": r.get("total")})
    me = next((e for e in entries if e["player_id"] == player_id), None) if player_id else None
    total_players = len(await db.scores.distinct("player_id", match)) if match else len(await db.scores.distinct("player_id"))
    return {"period": period, "metric": metric, "entries": entries, "me": me, "total_players": total_players}


# ---------------- cloud sync (signed-in users) ----------------
class SyncBody(BaseModel):
    data: dict
    updated_at: str


@api_router.get("/sync")
async def get_sync(user: dict = Depends(get_current_user)):
    doc = await db.sync.find_one({"user_id": str(user["_id"])}, {"_id": 0})
    return doc or {"user_id": str(user["_id"]), "data": None, "updated_at": None}


@api_router.put("/sync")
async def put_sync(body: SyncBody, user: dict = Depends(get_current_user)):
    if len(json.dumps(body.data)) > 2_000_000:
        raise HTTPException(status_code=413, detail="Progress payload too large")
    doc = {"user_id": str(user["_id"]), "data": body.data, "updated_at": body.updated_at, "saved_at": datetime.now(timezone.utc).isoformat()}
    await db.sync.replace_one({"user_id": doc["user_id"]}, doc, upsert=True)
    return {"ok": True, "updated_at": body.updated_at}


@api_router.get("/")
async def root():
    return {"message": "Spelling Bee API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o for o in os.environ.get('CORS_ORIGINS', '*').split(',') if o],
    allow_origin_regex=r"https?://.*",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.daily_results.create_index([("player_id", 1), ("date", 1)], unique=True)
    await db.daily_results.create_index([("date", 1), ("score", -1), ("time_ms", 1)])
    await db.rooms.create_index("code", unique=True)
    await db.classrooms.create_index("code", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_rate.create_index("email", unique=True)
    await db.scores.create_index([("created_at", -1)])
    await db.scores.create_index([("player_id", 1), ("created_at", -1)])
    await db.sync.create_index("user_id", unique=True)

    demo_email = os.environ.get("DEMO_EMAIL")
    demo_password = os.environ.get("DEMO_PASSWORD")
    if demo_email and demo_password:
        existing = await db.users.find_one({"email": demo_email})
        if not existing:
            await db.users.insert_one({
                "email": demo_email,
                "password_hash": hash_password(demo_password),
                "name": "Demo Speller",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        elif not verify_password(demo_password, existing["password_hash"]):
            await db.users.update_one({"email": demo_email}, {"$set": {"password_hash": hash_password(demo_password)}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
