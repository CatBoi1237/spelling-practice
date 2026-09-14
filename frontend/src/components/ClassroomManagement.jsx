import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Clock3,
  Lock,
  LogOut,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  TimerReset,
  Unlock,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { pickSeededWords } from "@/lib/seeded";
import { speak, cancelSpeech } from "@/lib/speech";

export default function ClassroomManagement() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();
  const { user } = useAuth();
  const { settings } = useApp();
  const [room, setRoom] = useState(null);
  const [busy, setBusy] = useState("");
  const [hidden, setHidden] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || hidden) return;
    try {
      const { data } = await api.get(`/classrooms/${roomCode}/manage`);
      setRoom(data);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) setHidden(true);
    }
  }, [roomCode, user, hidden]);

  useEffect(() => {
    if (!user) return undefined;
    refresh();
    const timer = setInterval(refresh, 1200);
    return () => clearInterval(timer);
  }, [refresh, user]);

  const action = async (key, request, message) => {
    setBusy(key);
    try {
      const { data } = await request();
      setRoom(data);
      window.dispatchEvent(new CustomEvent("spellbee:classroom-management-changed"));
      if (message) toast.success(message);
      return data;
    } catch (error) {
      toast.error(apiError(error, "Could not update the classroom."));
      return null;
    } finally {
      setBusy("");
    }
  };

  const hostWords = useMemo(() => {
    if (!room?.seed || !room?.word_count || !room?.difficulty) return [];
    return pickSeededWords(room.seed, room.word_count, room.difficulty);
  }, [room?.seed, room?.word_count, room?.difficulty]);

  if (!user || hidden || !room || room.role !== "host") return null;

  const lobbyLike = room.status === "lobby" || room.status === "locked";
  const liveLike = room.status === "running" || room.status === "paused";
  const isPaused = room.status === "paused" || room.paused;
  const isLocked = room.status === "locked" || room.locked;
  const readyCount = room.ready_count || 0;
  const allReady = room.students.length > 0 && readyCount === room.students.length;

  const kick = (student) => {
    if (!window.confirm(`Remove ${student.name} from this classroom?`)) return;
    action(
      `kick:${student.player_id}`,
      () => api.delete(`/classrooms/${roomCode}/students/${encodeURIComponent(student.player_id)}`),
      `${student.name} removed.`
    );
  };

  const endEarly = () => {
    if (!window.confirm("End this Classroom game now? The current leaderboard will become final.")) return;
    action("end", () => api.post(`/classrooms/${roomCode}/manage/end`), "Classroom ended.");
  };

  const startLockedGame = async () => {
    const nextIndex = (room.round_index ?? -1) + 1;
    const nextWord = hostWords[nextIndex];
    if (!nextWord) {
      toast.error("No word is available to start this game.");
      return;
    }

    const data = await action(
      "start",
      () => api.post(`/classrooms/${roomCode}/round/start`, { word: nextWord.word }),
      "Classroom started."
    );

    if (data) {
      cancelSpeech();
      setTimeout(() => {
        speak(nextWord.word, {
          rate: settings.rate,
          voiceName: settings.voiceName,
          voiceLang: settings.voiceLang,
        });
      }, 650);
    }
  };

  return (
    <section className="mx-auto mt-6 max-w-6xl rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 via-slate-900/70 to-slate-950 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">
            <ShieldCheck className="h-4 w-4" /> Teacher room management
          </div>
          <h2 className="mt-2 font-heading text-2xl font-black text-slate-50">Class controls</h2>
          <p className="mt-1 text-sm text-slate-500">Manage joining, timing and students without exposing the spelling word.</p>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-300">
          {isPaused ? "Paused" : isLocked ? "Locked" : room.status}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {lobbyLike && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => action(
              "lock",
              () => api.post(`/classrooms/${roomCode}/manage/lock`, { enabled: !isLocked }),
              isLocked ? "Joining reopened." : "Joining locked."
            )}
            className={isLocked
              ? "inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300"
              : "inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-300"
            }
          >
            {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {isLocked ? "Reopen joining" : "Lock joining"}
          </button>
        )}

        {isLocked && (
          <button
            type="button"
            disabled={!!busy || !allReady}
            onClick={startLockedGame}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-4 w-4" /> Start locked game
          </button>
        )}

        {liveLike && !room.revealed && (
          <>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => action(
                "pause",
                () => api.post(`/classrooms/${roomCode}/manage/pause`, { enabled: !isPaused }),
                isPaused ? "Round resumed." : "Round paused."
              )}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-bold text-indigo-300"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? "Resume round" : "Pause round"}
            </button>
            {[5, 10, 20].map((seconds) => (
              <button
                key={seconds}
                type="button"
                disabled={!!busy}
                onClick={() => action(
                  `time:${seconds}`,
                  () => api.post(`/classrooms/${roomCode}/manage/time`, { seconds }),
                  `Added ${seconds} seconds.`
                )}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-amber-500/30 hover:text-amber-300"
              >
                <TimerReset className="h-4 w-4" /> +{seconds}s
              </button>
            ))}
          </>
        )}

        {room.status !== "finished" && (
          <button
            type="button"
            disabled={!!busy}
            onClick={endEarly}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/5 px-4 py-2.5 text-sm font-bold text-rose-300"
          >
            <LogOut className="h-4 w-4" /> End game early
          </button>
        )}

        {room.status === "finished" && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => action(
              "rematch",
              () => api.post(`/classrooms/${roomCode}/manage/rematch`),
              "Rematch ready — students can ready up again."
            )}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400"
          >
            <RotateCcw className="h-4 w-4" /> Rematch
          </button>
        )}

        <button type="button" disabled={!!busy} onClick={refresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-300">
          <RefreshCcw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
        </button>
      </div>

      {isLocked && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200/80">
          Joining is locked. Existing students stay in the room. {allReady ? "Everyone is ready, so you can start the game while it stays locked." : `Waiting for ${room.students.length - readyCount} student${room.students.length - readyCount === 1 ? "" : "s"} to be ready before starting.`}
        </div>
      )}

      {isPaused && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs text-indigo-200">
          <Clock3 className="h-4 w-4" /> The round is paused. Student submissions are blocked until you resume.
          {room.paused_remaining_ms != null && <span className="font-mono font-bold text-indigo-100">~{Math.max(0, Math.ceil(room.paused_remaining_ms / 1000))}s remaining</span>}
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-slate-100"><Users className="h-4 w-4 text-indigo-300" /> Students</h3>
          <span className="text-xs font-bold text-slate-500">{readyCount}/{room.students.length} ready · {room.students.length} joined</span>
        </div>
        {room.students.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {room.students.map((student) => (
              <div key={student.player_id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-3">
                <span className={student.ready || student.answered ? "h-2.5 w-2.5 rounded-full bg-emerald-400" : "h-2.5 w-2.5 rounded-full bg-slate-600"} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-200">{student.name}</div>
                  <div className="text-[10px] text-slate-600">{student.registered ? "Signed in" : "Guest"} · {student.total_points || 0} pts</div>
                </div>
                {room.status !== "finished" && (
                  <button
                    type="button"
                    onClick={() => kick(student)}
                    disabled={busy === `kick:${student.player_id}`}
                    aria-label={`Remove ${student.name}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-rose-500/20 text-rose-300/80 hover:bg-rose-500/10"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-slate-800 p-5 text-center text-xs text-slate-600">No students have joined yet.</div>
        )}
      </div>
    </section>
  );
}
