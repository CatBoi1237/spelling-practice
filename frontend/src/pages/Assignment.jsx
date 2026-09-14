import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  RotateCcw,
  Send,
  Speaker,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { getPlayerId } from "@/lib/identity";
import { cancelSpeech, speak } from "@/lib/speech";

function dueText(value) {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No due date" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function Assignment() {
  const { code } = useParams();
  const assignmentCode = (code || "").toUpperCase();
  const { user, playerName, renameGuest } = useAuth();
  const { settings } = useApp();
  const playerId = user?.id || getPlayerId();

  const [assignment, setAssignment] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("intro");
  const [name, setName] = useState(playerName || "");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [times, setTimes] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const startedRef = useRef(Date.now());

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/assignments/${assignmentCode}`, { params: { player_id: playerId } });
      setAssignment(data);
      setError("");
    } catch (err) {
      setError(apiError(err, "Assignment not found."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => cancelSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentCode, playerId]);

  const currentWord = assignment?.words?.[index] || null;
  const voiceOptions = useMemo(() => ({
    rate: settings.rate,
    voiceName: settings.voiceName,
    voiceLang: settings.voiceLang,
  }), [settings.rate, settings.voiceName, settings.voiceLang]);

  useEffect(() => {
    if (phase !== "running" || !currentWord) return;
    setAnswer("");
    startedRef.current = Date.now();
    const timer = setTimeout(() => speak(currentWord, voiceOptions), 450);
    return () => clearTimeout(timer);
  }, [phase, index, currentWord, voiceOptions]);

  const play = (rate = null) => {
    if (!currentWord) return;
    cancelSpeech();
    speak(currentWord, { ...voiceOptions, rate: rate || voiceOptions.rate });
  };

  const start = () => {
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Enter your name first.");
      return;
    }
    if (!user) renameGuest(cleanName);
    if (!assignment?.attempts_remaining) {
      toast.error("You have used all attempts for this assignment.");
      return;
    }
    setIndex(0);
    setAnswers([]);
    setTimes([]);
    setResult(null);
    setPhase("running");
  };

  const submitAll = async (nextAnswers, nextTimes) => {
    setSubmitting(true);
    cancelSpeech();
    try {
      const { data } = await api.post(`/assignments/${assignmentCode}/submit`, {
        player_id: playerId,
        name: name.trim(),
        answers: nextAnswers,
        times_ms: nextTimes,
      });
      setResult({ ...data.submission, attempts_remaining: data.attempts_remaining });
      setAssignment((current) => current ? {
        ...current,
        attempts_used: (current.attempts_used || 0) + 1,
        attempts_remaining: data.attempts_remaining,
        latest_submission: data.submission,
      } : current);
      setPhase("results");
    } catch (err) {
      toast.error(apiError(err, "Could not submit your assignment."));
    } finally {
      setSubmitting(false);
    }
  };

  const next = async (event) => {
    event.preventDefault();
    if (!answer.trim()) {
      toast.error("Type the spelling before continuing.");
      return;
    }
    const nextAnswers = [...answers, answer.trim()];
    const nextTimes = [...times, Math.max(0, Date.now() - startedRef.current)];
    setAnswers(nextAnswers);
    setTimes(nextTimes);

    if (index + 1 >= assignment.words.length) {
      await submitAll(nextAnswers, nextTimes);
      return;
    }
    setIndex((value) => value + 1);
  };

  if (loading) {
    return <div className="grid place-items-center py-24 text-slate-500"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  if (error || !assignment) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-500/25 bg-rose-500/10 p-8 text-center">
        <h1 className="font-heading text-2xl font-black text-rose-200">{error || "Assignment unavailable"}</h1>
        <Link to="/" className="mt-6 inline-flex rounded-xl bg-rose-500 px-5 py-3 font-bold text-white">Back home</Link>
      </div>
    );
  }

  if (phase === "results" && result) {
    return <AssignmentResults assignment={assignment} result={result} onRetry={start} />;
  }

  if (phase === "running") {
    const progress = Math.round(((index + 1) / assignment.word_count) * 100);
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div><span className="font-bold text-slate-100">{assignment.title}</span><span className="ml-2 text-slate-500">Word {index + 1}/{assignment.word_count}</span></div>
            <span className="font-mono text-amber-300">{progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </header>

        <section className="rounded-3xl border border-indigo-500/25 bg-gradient-to-b from-slate-900 to-slate-950 p-7 text-center sm:p-10">
          <Speaker className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="mt-4 font-heading text-3xl font-black text-slate-50">Listen, then spell.</h1>
          <p className="mt-2 text-sm text-slate-500">The spelling is hidden until your assignment is marked at the end.</p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => play()} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-slate-950"><Speaker className="mr-2 inline h-4 w-4" />Repeat</button>
            <button type="button" onClick={() => play("slow")} className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-bold text-slate-200">🐢 Slow</button>
            <button type="button" onClick={() => play("verySlow")} className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-2.5 text-sm font-bold text-amber-300">🐢 Very slow</button>
          </div>

          <form onSubmit={next} className="mx-auto mt-8 max-w-xl">
            <input
              autoFocus
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="done"
              placeholder="Type the word..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-5 text-center text-2xl font-semibold text-slate-100 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
            />
            <button type="submit" disabled={submitting || !answer.trim()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 font-black text-white hover:bg-indigo-400 disabled:opacity-40">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : index + 1 === assignment.word_count ? <Send className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              {index + 1 === assignment.word_count ? "Submit assignment" : "Next word"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  const past = assignment.latest_submission;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-indigo-950/30 p-7 sm:p-9">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-300"><GraduationCap className="h-6 w-6" /></span>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">SpellBee assignment · {assignment.code}</div>
            <h1 className="mt-2 font-heading text-4xl font-black text-slate-50">{assignment.title}</h1>
            <p className="mt-2 text-sm text-slate-400">From {assignment.teacher_name} · {assignment.word_count} words</p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Info icon={Clock3} label="Due" value={dueText(assignment.due_at)} />
        <Info icon={RotateCcw} label="Attempts" value={`${assignment.attempts_remaining ?? assignment.attempts_allowed} remaining`} />
        <Info icon={CheckCircle2} label="Status" value={assignment.status === "active" ? "Open" : "Closed"} />
      </section>

      {past && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Your latest attempt</div>
          <div className="mt-2 flex flex-wrap items-baseline gap-3"><span className="font-heading text-3xl font-black text-slate-50">{past.accuracy}%</span><span className="text-sm text-slate-400">{past.correct}/{past.total} correct</span></div>
        </div>
      )}

      <section className="rounded-3xl border border-slate-800 bg-slate-900/45 p-6 sm:p-8">
        <label className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Your name
          <input value={name} onChange={(event) => setName(event.target.value)} disabled={!!user} maxLength={24} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none disabled:opacity-70" />
        </label>
        <button onClick={start} disabled={assignment.status !== "active" || !assignment.attempts_remaining} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-black text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40">
          <Speaker className="h-4 w-4" /> {past ? "Start another attempt" : "Start assignment"}
        </button>
        {assignment.status !== "active" && <p className="mt-3 text-center text-xs text-slate-500">Your teacher has closed this assignment.</p>}
        {!assignment.attempts_remaining && <p className="mt-3 text-center text-xs text-slate-500">You have used all allowed attempts.</p>}
      </section>
    </div>
  );
}

function AssignmentResults({ assignment, result, onRetry }) {
  const averageSeconds = result.avg_time_ms ? (result.avg_time_ms / 1000).toFixed(1) : "0.0";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-3xl border border-amber-500/25 bg-gradient-to-b from-slate-900 to-slate-950 p-8 text-center sm:p-10">
        <Trophy className="mx-auto h-12 w-12 text-amber-400" />
        <div className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Assignment complete</div>
        <h1 className="mt-2 font-heading text-5xl font-black text-slate-50">{result.accuracy}%</h1>
        <p className="mt-2 text-slate-400">{result.correct}/{result.total} correct · {averageSeconds}s average</p>
      </section>

      {result.missed?.length > 0 ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/45 p-6">
          <h2 className="font-heading text-2xl font-bold text-slate-50">Words to review</h2>
          <div className="mt-4 space-y-2">
            {result.missed.map((item) => (
              <div key={`${item.index}-${item.word}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <span className="font-mono font-bold text-amber-300">{item.word}</span>
                <span className="text-sm text-slate-500">You wrote: <span className="text-rose-300">{item.answer || "—"}</span></span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-7 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" /><div className="mt-3 font-heading text-2xl font-bold text-emerald-200">Perfect spelling!</div></div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {result.attempts_remaining > 0 && <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950"><RotateCcw className="h-4 w-4" /> Try again ({result.attempts_remaining} left)</button>}
        <Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 font-bold text-slate-200">Done</Link>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"><Icon className="h-3.5 w-3.5 text-amber-400" />{label}</div><div className="mt-2 text-sm font-bold text-slate-100">{value}</div></div>;
}
