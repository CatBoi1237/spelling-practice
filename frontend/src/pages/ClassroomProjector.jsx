import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, GraduationCap, Trophy, Users } from "lucide-react";
import { useParams } from "react-router-dom";

import { api } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { useAuth } from "@/context/AuthContext";
import ClassroomQrCard from "@/components/ClassroomQrCard";

function seconds(ms) {
  return Math.max(0, Math.ceil(Number(ms || 0) / 1000));
}

export default function ClassroomProjector() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();
  const { user } = useAuth();
  const playerId = user?.id || getPlayerId();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [remainingMs, setRemainingMs] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get(`/classrooms/${roomCode}`, {
        params: { player_id: playerId },
      });
      setRoom(data);
      setError("");
    } catch {
      setError("Classroom not found");
    }
  }, [roomCode, playerId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 650);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!room?.round_started_at || room.status !== "running" || room.revealed) {
      setRemainingMs(0);
      return undefined;
    }

    const update = () => {
      const elapsed = Math.max(0, Date.now() - Date.parse(room.round_started_at));
      setRemainingMs(Math.max(0, Number(room.time_limit_ms || 0) - elapsed));
    };

    update();
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [room?.round_started_at, room?.time_limit_ms, room?.status, room?.revealed, room?.round_index]);

  const standings = useMemo(
    () => [...(room?.students || [])].sort((a, b) =>
      Number(b.total_points || 0) - Number(a.total_points || 0) ||
      a.name.localeCompare(b.name)
    ),
    [room?.students]
  );

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 p-8 text-center text-slate-100">
        <div>
          <GraduationCap className="mx-auto h-16 w-16 text-rose-300" />
          <h1 className="mt-5 font-heading text-4xl font-black">{error}</h1>
          <p className="mt-2 text-slate-500">Check the six-character classroom code.</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-2xl font-bold text-amber-300">Loading SpellBee…</div>;
  }

  const answered = Number(room.answered_count || 0);
  const totalStudents = room.students.length;
  const progress = totalStudents ? Math.round((answered / totalStudents) * 100) : 0;
  const timerSeconds = seconds(remainingMs);
  const timerDanger = timerSeconds > 0 && timerSeconds <= 5;

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 p-5 text-slate-100 sm:p-8 lg:p-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[1500px] flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/40 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-500 text-slate-950">
              <GraduationCap className="h-8 w-8" />
            </span>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.28em] text-amber-300">SpellBee Classroom</div>
              <div className="mt-1 font-heading text-2xl font-black text-slate-50 sm:text-3xl">{room.host_name}'s class</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Join code</div>
            <div className="mt-1 font-mono text-3xl font-black tracking-[0.3em] text-amber-300 sm:text-4xl">{roomCode}</div>
          </div>
        </header>

        {room.status === "lobby" && (
          <section className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.65fr)]">
            <div className="flex flex-col justify-between rounded-[2rem] border border-slate-800 bg-slate-900/45 p-7 sm:p-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-200">
                  <Users className="h-4 w-4" /> Waiting room
                </div>
                <h1 className="mt-5 font-heading text-5xl font-black tracking-tight text-slate-50 sm:text-6xl lg:text-7xl">Scan. Join. Ready up.</h1>
                <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-400 sm:text-xl">
                  Students can scan the QR code or visit SpellBee and enter <strong className="text-amber-300">{roomCode}</strong> in Join Game.
                </p>
              </div>

              <div className="mt-8">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Ready students</div>
                    <div className="mt-1 font-heading text-5xl font-black text-slate-50">{room.ready_count || 0}<span className="text-2xl text-slate-600">/{totalStudents}</span></div>
                  </div>
                  <div className="text-right text-sm text-slate-500">{room.word_count} words · {seconds(room.time_limit_ms)}s each</div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {room.students.length ? room.students.map((student) => (
                    <span key={student.player_id} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${student.ready ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-950/50 text-slate-400"}`}>
                      {student.ready && <CheckCircle2 className="h-4 w-4" />}
                      {student.name}
                    </span>
                  )) : <span className="text-slate-500">Waiting for the first student…</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center rounded-[2rem] border border-slate-800 bg-slate-900/45 p-5">
              <ClassroomQrCard roomCode={roomCode} />
            </div>
          </section>
        )}

        {room.status === "running" && (
          <section className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)]">
            <div className="relative flex min-h-[520px] flex-col justify-center overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950 p-8 text-center sm:p-12">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="relative">
                <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Word {room.round_index + 1} of {room.word_count}</div>

                {!room.revealed ? (
                  <>
                    <div className={`mx-auto mt-8 grid h-44 w-44 place-items-center rounded-full border-8 ${timerDanger ? "border-rose-500/50 bg-rose-500/10 text-rose-300" : "border-indigo-500/35 bg-indigo-500/10 text-indigo-200"}`}>
                      <div>
                        <Clock3 className="mx-auto h-9 w-9 opacity-70" />
                        <div className="mt-2 font-mono text-6xl font-black">{timerSeconds}</div>
                      </div>
                    </div>
                    <h1 className="mt-8 font-heading text-4xl font-black text-slate-50 sm:text-6xl">Listen to your teacher</h1>
                    <p className="mt-3 text-lg text-slate-500">Type the spelling on your own device.</p>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-emerald-200">
                      <CheckCircle2 className="h-5 w-5" /> Revealed
                    </div>
                    <div className="mt-7 text-sm font-black uppercase tracking-[0.25em] text-slate-500">Correct spelling</div>
                    <h1 className="mt-3 break-words font-mono text-5xl font-black tracking-[0.08em] text-amber-300 sm:text-7xl lg:text-8xl">{room.correct_word || "—"}</h1>
                  </>
                )}

                <div className="mx-auto mt-10 max-w-2xl">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-400">
                    <span>{answered}/{totalStudents} answered</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-amber-400 transition-[width] duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <Leaderboard standings={standings} />
          </section>
        )}

        {room.status === "finished" && (
          <section className="grid flex-1 place-items-center rounded-[2rem] border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-slate-900 to-indigo-950/40 p-8 text-center">
            <div className="w-full max-w-5xl">
              <Trophy className="mx-auto h-16 w-16 text-amber-300" />
              <div className="mt-4 text-xs font-black uppercase tracking-[0.28em] text-amber-300">Class complete</div>
              <h1 className="mt-2 font-heading text-5xl font-black text-slate-50 sm:text-7xl">Final leaderboard</h1>
              <div className="mx-auto mt-8 max-w-3xl"><Leaderboard standings={standings} final /></div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Leaderboard({ standings, final = false }) {
  return (
    <aside className="rounded-[2rem] border border-slate-800 bg-slate-900/45 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.23em] text-amber-300">
        <Trophy className="h-4 w-4" /> {final ? "Final standings" : "Live leaderboard"}
      </div>
      <div className="mt-5 space-y-2">
        {standings.length ? standings.slice(0, 12).map((student, index) => (
          <div key={student.player_id} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${index === 0 ? "border-amber-500/30 bg-amber-500/10" : "border-slate-800 bg-slate-950/45"}`}>
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-mono text-sm font-black ${index === 0 ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>#{index + 1}</div>
            <div className="min-w-0 flex-1 truncate text-lg font-bold text-slate-100">{student.name}</div>
            <div className="font-mono text-lg font-black text-amber-300">{Number(student.total_points || 0).toLocaleString()}</div>
          </div>
        )) : (
          <div className="py-10 text-center text-slate-600">No students yet</div>
        )}
      </div>
    </aside>
  );
}
