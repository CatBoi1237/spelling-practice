import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Users, Plus, LogIn, School } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import {
  assignCustomListToGame,
  buildCustomRacePath,
  getCustomWordList,
} from "@/lib/customWordLists";
import { useAuth } from "@/context/AuthContext";
import WordSourcePicker from "@/components/WordSourcePicker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const COUNTS = [5, 10, 15, 25];
const DIFFS = ["easy", "medium", "hard", "extreme", "mixed"];

export default function Multiplayer() {
  const navigate = useNavigate();
  const { user, isTeacher, playerName, renameGuest } = useAuth();
  const playerId = user?.id || getPlayerId();

  const [wordCount, setWordCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [selectedWordListId, setSelectedWordListId] = useState(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState(playerName);
  const [busy, setBusy] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [classBusy, setClassBusy] = useState(false);
  const [timeLimit, setTimeLimit] = useState(20);

  const saveName = () => {
    if (!user) renameGuest(name);
  };

  const selectedList = isTeacher && selectedWordListId
    ? getCustomWordList(selectedWordListId)
    : null;
  const usingCustomList = !!selectedList;
  const effectiveWordCount = selectedList?.words?.length || wordCount;

  const requireSelectedList = () => {
    if (!isTeacher) return null;
    if (!selectedWordListId) return null;
    const list = getCustomWordList(selectedWordListId);
    if (!list) {
      setSelectedWordListId(null);
      toast.error("That custom list no longer exists. Choose another list.");
      return false;
    }
    return list;
  };

  const create = async () => {
    const customList = requireSelectedList();
    if (customList === false) return;

    setBusy(true);
    saveName();
    try {
      const { data } = await api.post("/rooms", {
        player_id: playerId,
        name: name || playerName,
        word_count: customList?.words?.length || wordCount,
        difficulty: customList ? "mixed" : difficulty,
      });

      if (customList) {
        assignCustomListToGame("room", data.code, customList);
        navigate(buildCustomRacePath(data.code, customList));
      } else {
        navigate(`/room/${data.code}`);
      }
    } catch (e) {
      toast.error(apiError(e, "Could not create the room."));
    } finally {
      setBusy(false);
    }
  };

  const join = async (e) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) {
      toast.error("Room codes are 6 characters.");
      return;
    }
    setBusy(true);
    saveName();
    try {
      await api.get(`/rooms/${clean}`);
      navigate(`/room/${clean}`);
    } catch (err) {
      toast.error(apiError(err, "Room not found."));
    } finally {
      setBusy(false);
    }
  };

  const createClassroom = async () => {
    if (!isTeacher) return;
    if (!user) {
      toast.error("Teachers need to sign in before hosting Classroom Mode.");
      navigate("/signin");
      return;
    }

    const customList = requireSelectedList();
    if (customList === false) return;

    setClassBusy(true);

    try {
      const { data } = await api.post("/classrooms", {
        word_count: customList?.words?.length || wordCount,
        difficulty: customList ? "mixed" : difficulty,
        time_limit_sec: timeLimit,
      });

      if (customList) {
        // Classroom students never receive this list. It stays only on the
        // teacher's browser and the teacher sends one active word at a time
        // through the existing classroom round endpoint.
        assignCustomListToGame("classroom", data.code, customList);
      }

      navigate(`/classroom/${data.code}`);
    } catch (e) {
      toast.error(apiError(e, "Could not create classroom."));
    } finally {
      setClassBusy(false);
    }
  };

  const joinClassroom = async (e) => {
    e.preventDefault();
    if (isTeacher) return;

    const clean = classCode.trim().toUpperCase();

    if (clean.length !== 6) {
      toast.error("Classroom codes are 6 characters.");
      return;
    }

    setClassBusy(true);
    saveName();

    try {
      await api.get(`/classrooms/${clean}`, {
        params: {
          player_id: playerId,
        },
      });

      navigate(`/classroom/${clean}`);
    } catch (e) {
      toast.error(apiError(e, "Classroom not found."));
    } finally {
      setClassBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-300">
          <Swords className="h-3 w-3" /> Live multiplayer
        </span>
        <h1 className="mt-4 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">Race your friends.</h1>
        <p className="mt-2 max-w-2xl text-base text-slate-400">
          Create a room, share the invite, and everyone spells the same word list at the same time. The leaderboard updates live as you type.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500/80">Your display name</label>
        <input
          data-testid="player-name-input"
          value={name}
          disabled={!!user}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          maxLength={24}
          className="mt-2 w-full max-w-sm rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-amber-500/40 focus:border-amber-500/50 focus:ring-2 disabled:opacity-60"
        />
        {user && <p className="mt-2 text-xs text-slate-500">Using your account name. Signed in as {user.email}.</p>}
      </div>

      <WordSourcePicker
        selectedId={selectedWordListId}
        onChange={setSelectedWordListId}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950 p-6 sm:p-8">
          <h2 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-100">
            <Plus className="h-5 w-5 text-amber-400" /> Create a room
          </h2>

          <div className={cn("mt-6", usingCustomList && "opacity-45")}>
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Words</span>
            <div className="mt-2 flex gap-2">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  data-testid={`word-count-${c}`}
                  onClick={() => setWordCount(c)}
                  disabled={usingCustomList}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed",
                    wordCount === c ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className={cn("mt-5", usingCustomList && "opacity-45")}>
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Difficulty</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIFFS.map((d) => (
                <button
                  key={d}
                  data-testid={`room-difficulty-${d}`}
                  onClick={() => setDifficulty(d)}
                  disabled={usingCustomList}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-semibold capitalize transition disabled:cursor-not-allowed",
                    difficulty === d ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {usingCustomList && (
            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200/80">
              This race will use all {effectiveWordCount} words from <strong>{selectedList.name}</strong>. Players must join custom races with the invite link so their browser receives the same list.
            </div>
          )}

          <button
            data-testid="create-room-button"
            onClick={create}
            disabled={busy}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50"
          >
            <Users className="h-4 w-4" /> Create room
          </button>
        </div>

        <form onSubmit={join} className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950 p-6 sm:p-8">
          <h2 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-100">
            <LogIn className="h-5 w-5 text-indigo-400" /> Join a room
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Got a standard room code? Drop it in below. For a custom-list race, use the host's invite link instead so the list travels with the invite.
          </p>
          <input
            data-testid="room-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="mt-6 w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-center font-mono text-2xl uppercase tracking-[0.4em] text-slate-100 outline-none ring-indigo-500/40 focus:border-indigo-500/50 focus:ring-2"
          />
          <button
            type="submit"
            data-testid="join-room-button"
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:opacity-50"
          >
            Join race
          </button>
        </form>
      </div>

      <section className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-500/15 p-3">
            <School className="h-7 w-7 text-amber-400" />
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-400">
              Classroom Mode
            </div>

            <h2 className="mt-1 font-heading text-3xl font-black text-slate-50">
              Teacher-led spelling game
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              The teacher controls the words and audio. Students only type their spelling.
              Correct and faster answers earn more points. Incorrect answers earn zero.
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-6 md:grid-cols-2">
          {isTeacher && <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <h3 className="font-heading text-xl font-bold text-slate-100">
              Host a classroom
            </h3>

            <p className="mt-2 text-xs text-slate-500">
              Teacher account required. {usingCustomList ? `Using ${selectedList.name} (${effectiveWordCount} words).` : "Using the built-in word settings above."}
            </p>

            <div className="mt-5">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Seconds per word
              </div>

              <div className="mt-2 flex gap-2">
                {[15, 20, 30].map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => setTimeLimit(seconds)}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      timeLimit === seconds
                        ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={createClassroom}
              disabled={classBusy}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              <School className="h-4 w-4" />
              Host Classroom Game
            </button>
          </div>}

          {!isTeacher && <form
            onSubmit={joinClassroom}
            className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"
          >
            <h3 className="font-heading text-xl font-bold text-slate-100">
              Join a classroom
            </h3>

            <p className="mt-2 text-xs text-slate-500">
              Students do not need an account. Custom classroom lists stay hidden on the teacher's device until each word is revealed.
            </p>

            <input
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="BEE742"
              className="mt-6 w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-center font-mono text-2xl uppercase tracking-[0.4em] text-slate-100 outline-none ring-amber-500/40 focus:border-amber-500/50 focus:ring-2"
            />

            <button
              type="submit"
              disabled={classBusy}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-6 py-3 font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
            >
              Join classroom
            </button>
          </form>}
        </div>
      </section>
    </div>
  );
}
