import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Users, Plus, LogIn } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const COUNTS = [5, 10, 15, 25];
const DIFFS = ["easy", "medium", "hard", "extreme", "mixed"];

export default function Multiplayer() {
  const navigate = useNavigate();
  const { user, playerName, renameGuest } = useAuth();
  const playerId = user?.id || getPlayerId();

  const [wordCount, setWordCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [code, setCode] = useState("");
  const [name, setName] = useState(playerName);
  const [busy, setBusy] = useState(false);

  const saveName = () => {
    if (!user) renameGuest(name);
  };

  const create = async () => {
    setBusy(true);
    saveName();
    try {
      const { data } = await api.post("/rooms", {
        player_id: playerId,
        name: name || playerName,
        word_count: wordCount,
        difficulty,
      });
      navigate(`/room/${data.code}`);
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

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-300">
          <Swords className="h-3 w-3" /> Live multiplayer
        </span>
        <h1 className="mt-4 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">Race your friends.</h1>
        <p className="mt-2 max-w-2xl text-base text-slate-400">
          Create a room, share the 6-character code, and everyone spells the same word list at the same time. The leaderboard updates live as you type.
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

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950 p-6 sm:p-8">
          <h2 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-100">
            <Plus className="h-5 w-5 text-amber-400" /> Create a room
          </h2>

          <div className="mt-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Words</span>
            <div className="mt-2 flex gap-2">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  data-testid={`word-count-${c}`}
                  onClick={() => setWordCount(c)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                    wordCount === c ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Difficulty</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIFFS.map((d) => (
                <button
                  key={d}
                  data-testid={`room-difficulty-${d}`}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-semibold capitalize transition",
                    difficulty === d ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

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
          <p className="mt-3 text-sm text-slate-400">Got a code from a friend? Drop it in below.</p>
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
    </div>
  );
}
