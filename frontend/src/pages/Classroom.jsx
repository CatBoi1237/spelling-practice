import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  Eye,
  GraduationCap,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Speaker,
  Users,
} from "lucide-react";

import { api, apiError } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { pickSeededWords } from "@/lib/seeded";
import { speak, cancelSpeech } from "@/lib/speech";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";


function seconds(ms) {
  return Math.max(0, Math.ceil((ms || 0) / 1000));
}


export default function Classroom() {
  const { code } = useParams();

  const roomCode = (code || "").toUpperCase();

  const { user, playerName, renameGuest } = useAuth();
  const { settings } = useApp();

  const playerId = user?.id || getPlayerId();

  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");

  const [joinName, setJoinName] = useState(playerName || "");
  const [joining, setJoining] = useState(false);

  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [remainingMs, setRemainingMs] = useState(0);


  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/classrooms/${roomCode}`,
        {
          params: {
            player_id: playerId,
          },
        }
      );

      setRoom(data);
      setError("");
    } catch (e) {
      setError(apiError(e, "Classroom not found."));
    }
  }, [roomCode, playerId]);


  useEffect(() => {
    refresh();

    const timer = setInterval(refresh, 1000);

    return () => clearInterval(timer);
  }, [refresh]);


  useEffect(() => {
    setAnswer("");
  }, [room?.round_index]);


  // Student countdown.
  useEffect(() => {
    if (
      !room?.round_started_at ||
      room.status !== "running" ||
      room.revealed
    ) {
      setRemainingMs(0);
      return;
    }

    const update = () => {
      const started = Date.parse(room.round_started_at);

      const left =
        room.time_limit_ms -
        Math.max(0, Date.now() - started);

      setRemainingMs(Math.max(0, left));
    };

    update();

    const timer = setInterval(update, 100);

    return () => clearInterval(timer);
  }, [
    room?.round_started_at,
    room?.time_limit_ms,
    room?.status,
    room?.revealed,
    room?.round_index,
  ]);


  // When a student's timer expires, lock the round as 0 points.
  useEffect(() => {
    if (
      room?.role !== "student" ||
      room.status !== "running" ||
      room.revealed ||
      !room.round_started_at ||
      room.my_submission?.submitted
    ) {
      return;
    }

    const deadline =
      Date.parse(room.round_started_at) +
      room.time_limit_ms;

    const delay = Math.max(0, deadline - Date.now()) + 150;

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.post(
          `/classrooms/${roomCode}/submit`,
          {
            player_id: playerId,
            answer: "",
          }
        );

        setRoom(data);
      } catch {
        // Polling will recover if another request already submitted.
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [
    roomCode,
    playerId,
    room?.role,
    room?.status,
    room?.revealed,
    room?.round_started_at,
    room?.time_limit_ms,
    room?.round_index,
    room?.my_submission?.submitted,
  ]);


  const hostWords = useMemo(() => {
    if (room?.role !== "host" || !room?.seed) {
      return [];
    }

    return pickSeededWords(
      room.seed,
      room.word_count,
      room.difficulty
    );
  }, [
    room?.role,
    room?.seed,
    room?.word_count,
    room?.difficulty,
  ]);


  const join = async (e) => {
    e.preventDefault();

    const cleanName = joinName.trim();

    if (!cleanName) {
      toast.error("Enter your name first.");
      return;
    }

    setJoining(true);

    try {
      if (!user) {
        renameGuest(cleanName);
      }

      const { data } = await api.post(
        `/classrooms/${roomCode}/join`,
        {
          player_id: playerId,
          name: cleanName,
        }
      );

      setRoom(data);

      toast.success("Joined classroom!");
    } catch (e) {
      toast.error(
        apiError(e, "Could not join this classroom.")
      );
    } finally {
      setJoining(false);
    }
  };


  const startNextRound = async () => {
    const nextIndex = (room?.round_index ?? -1) + 1;

    const nextWord = hostWords[nextIndex];

    if (!nextWord) {
      toast.error("No more words are available.");
      return;
    }

    try {
      cancelSpeech();

      const { data } = await api.post(
        `/classrooms/${roomCode}/round/start`,
        {
          word: nextWord.word,
        }
      );

      setRoom(data);

      // Small delay gives student polling time to show the input
      // before the teacher's device pronounces the word.
      setTimeout(() => {
        speak(nextWord.word, {
          rate: settings.rate,
          voiceName: settings.voiceName,
          voiceLang: settings.voiceLang,
        });
      }, 700);
    } catch (e) {
      toast.error(
        apiError(e, "Could not start the next word.")
      );
    }
  };


  const playCurrentWord = (rateOverride = null) => {
    if (!room?.current_word) return;

    cancelSpeech();

    setTimeout(() => {
      speak(room.current_word, {
        rate: rateOverride || settings.rate,
        voiceName: settings.voiceName,
        voiceLang: settings.voiceLang,
      });
    }, 100);
  };


  const reveal = async () => {
    try {
      cancelSpeech();

      const { data } = await api.post(
        `/classrooms/${roomCode}/reveal`
      );

      setRoom(data);
    } catch (e) {
      toast.error(
        apiError(e, "Could not reveal this word.")
      );
    }
  };


  const finish = async () => {
    try {
      const { data } = await api.post(
        `/classrooms/${roomCode}/finish`
      );

      setRoom(data);
    } catch (e) {
      toast.error(
        apiError(e, "Could not finish the game.")
      );
    }
  };


  const submitAnswer = async (e) => {
    e.preventDefault();

    if (!answer.trim()) {
      toast.error("Type your spelling first.");
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await api.post(
        `/classrooms/${roomCode}/submit`,
        {
          player_id: playerId,
          answer,
        }
      );

      setRoom(data);
    } catch (e) {
      toast.error(
        apiError(e, "Could not submit your spelling.")
      );
    } finally {
      setSubmitting(false);
    }
  };


  const copyInvite = async () => {
    const url =
      `${window.location.origin}/classroom/${roomCode}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Classroom invite copied!");
    } catch {
      toast.error("Could not copy the invite.");
    }
  };


  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <h2 className="font-heading text-2xl font-bold text-rose-200">
          {error}
        </h2>

        <Link
          to="/multiplayer"
          className="mt-6 inline-block rounded-xl bg-rose-500 px-5 py-3 font-semibold text-white"
        >
          Back to multiplayer
        </Link>
      </div>
    );
  }


  if (!room) {
    return (
      <div className="grid place-items-center py-24 text-slate-400">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }


  // Direct classroom link opened by a student.
  if (room.role === "spectator") {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-3xl border border-amber-500/20 bg-slate-900/60 p-7 sm:p-9">
          <GraduationCap className="h-10 w-10 text-amber-400" />

          <h1 className="mt-5 font-heading text-3xl font-black text-slate-50">
            Join Classroom
          </h1>

          <p className="mt-2 text-slate-400">
            Teacher: {room.host_name}
          </p>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
              Room code
            </div>

            <div className="mt-1 font-mono text-3xl font-black tracking-[0.3em] text-amber-300">
              {roomCode}
            </div>
          </div>

          <form
            onSubmit={join}
            className="mt-6 space-y-4"
          >
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Your name
              </span>

              <input
                value={joinName}
                onChange={(e) =>
                  setJoinName(e.target.value)
                }
                maxLength={24}
                disabled={!!user}
                placeholder="Andrew"
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-amber-500/40 focus:border-amber-500/50 focus:ring-2"
              />
            </label>

            <button
              type="submit"
              disabled={joining}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {joining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}

              Join game
            </button>
          </form>
        </div>
      </div>
    );
  }


  const isHost = room.role === "host";
  const isStudent = room.role === "student";

  const lastRound =
    room.round_index === room.word_count - 1;

  const sortedStudents = [...room.students].sort(
    (a, b) =>
      b.total_points - a.total_points ||
      a.name.localeCompare(b.name)
  );


  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300">
              <GraduationCap className="h-3 w-3" />
              Classroom Mode
            </span>

            <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
              Join code
            </div>

            <div className="mt-1 font-mono text-4xl font-black tracking-[0.3em] text-slate-50">
              {roomCode}
            </div>

            <p className="mt-3 text-sm text-slate-400">
              Hosted by {room.host_name}
              {" · "}
              {room.word_count} words
              {" · "}
              <span className="capitalize">
                {room.difficulty}
              </span>
            </p>
          </div>

          {isHost && (
            <button
              onClick={copyInvite}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-amber-500/40 hover:text-amber-300"
            >
              <Copy className="h-4 w-4" />
              Copy student link
            </button>
          )}
        </div>
      </header>


      {room.status === "lobby" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8 lg:col-span-2">
            <h2 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-50">
              <Users className="h-5 w-5 text-amber-400" />
              Waiting room
            </h2>

            {isHost ? (
              <>
                <p className="mt-3 text-slate-400">
                  Put this room code on the board and wait for students to join.
                </p>

                <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
                  <div className="text-sm font-semibold text-slate-400">
                    Join at
                  </div>

                  <div className="mt-2 text-xl font-black text-slate-50">
                    spellbee.dpdns.org
                  </div>

                  <div className="mt-6 font-mono text-6xl font-black tracking-[0.18em] text-amber-300">
                    {roomCode}
                  </div>
                </div>

                <button
                  onClick={startNextRound}
                  disabled={!room.students.length}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Play className="h-4 w-4" />
                  Start game
                </button>
              </>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-slate-300">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Waiting for your teacher to start…
              </div>
            )}
          </section>

          <StudentList room={room} />
        </div>
      )}


      {room.status === "running" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            {isHost ? (
              <TeacherRound
                room={room}
                lastRound={lastRound}
                playWord={playCurrentWord}
                playWordSlow={() => playCurrentWord("slow")}
                playWordVerySlow={() => playCurrentWord("verySlow")}
                reveal={reveal}
                next={startNextRound}
                finish={finish}
              />
            ) : (
              <StudentRound
                room={room}
                answer={answer}
                setAnswer={setAnswer}
                remainingMs={remainingMs}
                submit={submitAnswer}
                submitting={submitting}
              />
            )}
          </section>

          <StudentList room={room} />
        </div>
      )}


      {room.status === "finished" && (
        <div className="rounded-3xl border border-amber-500/25 bg-gradient-to-b from-slate-900 to-slate-950 p-7 sm:p-10">
          <Crown className="mx-auto h-12 w-12 text-amber-400" />

          <h2 className="mt-4 text-center font-heading text-4xl font-black text-slate-50">
            Final leaderboard
          </h2>

          <div className="mx-auto mt-8 max-w-2xl space-y-3">
            {sortedStudents.map((student, index) => (
              <div
                key={student.player_id}
                className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-4"
              >
                <div className="w-12 text-center text-2xl">
                  {["🥇", "🥈", "🥉"][index] ||
                    `#${index + 1}`}
                </div>

                <div className="flex-1 font-bold text-slate-100">
                  {student.name}
                </div>

                <div className="font-mono text-xl font-black text-amber-300">
                  {student.total_points.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/multiplayer"
              className="inline-flex rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
            >
              New game
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}


function StudentList({ room }) {
  return (
    <aside className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5">
      <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-slate-100">
        <Users className="h-4 w-4 text-amber-400" />
        Students ({room.students.length})
      </h3>

      {room.status === "running" && (
        <p className="mt-1 text-xs text-slate-500">
          {room.answered_count}/{room.students.length} answered
        </p>
      )}

      <div className="mt-4 space-y-2">
        {room.students.length ? (
          room.students.map((student) => (
            <div
              key={student.player_id}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-3"
            >
              <span
                className={
                  student.answered
                    ? "h-2.5 w-2.5 rounded-full bg-emerald-400"
                    : "h-2.5 w-2.5 rounded-full bg-slate-600"
                }
              />

              <span className="flex-1 truncate text-sm font-semibold text-slate-200">
                {student.name}
              </span>

              <span className="font-mono text-xs text-amber-300">
                {student.total_points}
              </span>
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">
            Waiting for students…
          </p>
        )}
      </div>
    </aside>
  );
}


function TeacherRound({
  room,
  lastRound,
  playWord,
  playWordSlow,
  playWordVerySlow,
  reveal,
  next,
  finish,
}) {
  return (
    <div className="rounded-3xl border border-amber-500/25 bg-slate-900/60 p-7 sm:p-9">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-400">
            Teacher controls
          </div>

          <h2 className="mt-2 font-heading text-3xl font-black text-slate-50">
            Word {room.round_index + 1} of {room.word_count}
          </h2>
        </div>

        {!room.revealed && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-300">
            {room.answered_count}/{room.students.length} answered
          </div>
        )}
      </div>

      {!room.revealed ? (
        <>
          <div className="mt-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
            <Speaker className="mx-auto h-12 w-12 text-amber-400" />

            <p className="mt-4 text-sm text-slate-400">
              Audio plays only from this teacher device.
            </p>

            <button
              onClick={playWord}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-7 py-3 font-bold text-slate-950 hover:bg-amber-400"
            >
              <Speaker className="h-4 w-4" />
              Play / replay word
            </button>
          </div>

          <button
            onClick={reveal}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-6 py-3 font-bold text-indigo-200 hover:bg-indigo-500/20"
          >
            <Eye className="h-4 w-4" />
            Reveal & score
          </button>
        </>
      ) : (
        <>
          <div className="mt-8 rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-8 text-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              Correct spelling
            </div>

            <div className="mt-3 text-4xl font-black text-white">
              {room.correct_word}
            </div>
          </div>

          {lastRound ? (
            <button
              onClick={finish}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-7 py-3 font-bold text-slate-950 hover:bg-amber-400"
            >
              <Crown className="h-4 w-4" />
              Finish game
            </button>
          ) : (
            <button
              onClick={next}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-7 py-3 font-bold text-slate-950 hover:bg-amber-400"
            >
              <Play className="h-4 w-4" />
              Next word
            </button>
          )}
        </>
      )}
    </div>
  );
}


function StudentRound({
  room,
  answer,
  setAnswer,
  remainingMs,
  submit,
  submitting,
}) {
  const submitted = room.my_submission?.submitted;

  if (room.revealed) {
    const result = room.my_submission || {};

    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7 sm:p-9">
        {result.correct ? (
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        ) : (
          <div className="text-5xl">❌</div>
        )}

        <h2 className="mt-5 font-heading text-3xl font-black text-slate-50">
          {result.correct ? "Correct!" : "Incorrect"}
        </h2>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Correct spelling
          </div>

          <div className="mt-2 text-3xl font-black text-amber-300">
            {room.correct_word}
          </div>

          {!result.correct && result.answer && (
            <>
              <div className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                You wrote
              </div>

              <div className="mt-1 text-lg text-rose-300">
                {result.answer}
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-2xl font-black text-slate-50">
          +{result.points || 0} points
        </div>

        <div className="mt-1 text-sm text-slate-400">
          Total: {(result.total_points || 0).toLocaleString()}
        </div>

        <p className="mt-7 text-sm text-slate-500">
          Waiting for your teacher to continue…
        </p>
      </div>
    );
  }


  return (
    <div className="rounded-3xl border border-indigo-500/25 bg-slate-900/60 p-7 sm:p-9">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">
            Round {room.round_index + 1} of {room.word_count}
          </div>

          <h2 className="mt-2 font-heading text-3xl font-black text-slate-50">
            Listen to your teacher
          </h2>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 font-mono font-bold text-amber-300">
          <Clock3 className="h-4 w-4" />
          {seconds(remainingMs)}s
        </div>
      </div>

      {!submitted ? (
        <form
          onSubmit={submit}
          className="mt-8"
        >
          <input
            autoFocus
            value={answer}
            onChange={(e) =>
              setAnswer(e.target.value)
            }
            disabled={remainingMs <= 0}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="done"
            placeholder={
              remainingMs > 0
                ? "Type the word..."
                : "Time's up"
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-5 text-center text-2xl font-semibold text-slate-100 outline-none ring-indigo-500/40 focus:border-indigo-500/50 focus:ring-2 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={
              submitting ||
              remainingMs <= 0 ||
              !answer.trim()
            }
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 font-bold text-white hover:bg-indigo-400 disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}

            Submit spelling
          </button>
        </form>
      ) : (
        <div className="mt-8 rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />

          <h3 className="mt-4 text-xl font-bold text-slate-50">
            Answer locked
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            Waiting for your teacher to reveal the spelling…
          </p>
        </div>
      )}
    </div>
  );
}
