import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart3,
  CalendarClock,
  Copy,
  Loader2,
  RefreshCcw,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { api, apiError } from "@/lib/api";
import ClassChallenge from "@/components/ClassChallenge";

const ATTEMPTS = [1, 2, 3, 5];

function prettyDue(value) {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No due date" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function TeacherClassDetail() {
  const { code } = useParams();
  const classCode = (code || "").toUpperCase();
  const [room, setRoom] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [wordsText, setWordsText] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [attempts, setAttempts] = useState(2);

  const words = useMemo(() => {
    const seen = new Set();
    return wordsText
      .split(/[\n,]+/)
      .map((word) => word.trim())
      .filter((word) => {
        if (!word) return false;
        const key = word.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [wordsText]);

  const load = async () => {
    setLoading(true);
    try {
      const [classResult, analyticsResult] = await Promise.all([
        api.get(`/teacher/classes/${classCode}`),
        api.get(`/teacher/classes/${classCode}/analytics`),
      ]);
      setRoom(classResult.data);
      setAnalytics(analyticsResult.data);
    } catch (error) {
      toast.error(apiError(error, "Could not load this class."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classCode]);

  const copyJoin = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/class/${classCode}`);
      toast.success("Class join link copied.");
    } catch {
      toast.error("Could not copy the class link.");
    }
  };

  const removeStudent = async (student) => {
    if (!window.confirm(`Remove ${student.name} from this class?`)) return;
    try {
      const { data } = await api.delete(`/teacher/classes/${classCode}/students/${encodeURIComponent(student.player_id)}`);
      setRoom(data);
      const { data: nextAnalytics } = await api.get(`/teacher/classes/${classCode}/analytics`);
      setAnalytics(nextAnalytics);
      toast.success(`${student.name} removed.`);
    } catch (error) {
      toast.error(apiError(error, "Could not remove the student."));
    }
  };

  const createAssignment = async (event) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Give the assignment a title.");
      return;
    }
    if (words.length < 5 || words.length > 50) {
      toast.error("Use between 5 and 50 unique words.");
      return;
    }

    setBusy(true);
    try {
      await api.post(`/teacher/classes/${classCode}/assignments`, {
        title: title.trim(),
        words,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        attempts_allowed: attempts,
        level: room?.year_level || "custom",
      });
      setTitle("");
      setWordsText("");
      setDueAt("");
      toast.success("Assignment sent to this class.");
      await load();
    } catch (error) {
      toast.error(apiError(error, "Could not create the assignment."));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !room) {
    return <div className="grid place-items-center py-24 text-slate-500"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  if (!room) return null;

  const summary = analytics?.summary || {};
  const topMissed = analytics?.top_missed_words || [];

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-emerald-950/20 p-7 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">Teacher class</div>
            <h1 className="mt-2 font-heading text-4xl font-black text-slate-50 sm:text-5xl">{room.name}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
              {room.year_level && <span>{room.year_level}</span>}
              <span>{room.student_count} students</span>
              <span>{room.assignment_count} assignments</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-2 font-mono text-lg font-black tracking-[0.2em] text-amber-300">{room.code}</span>
            <button onClick={copyJoin} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-300 hover:text-white"><Copy className="h-4 w-4" /> Copy join link</button>
            <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-300"><RefreshCcw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh</button>
          </div>
        </div>
      </header>
      <ClassChallenge room={room} teacher onSaved={challenge => setRoom(value => ({ ...value, challenge }))} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Students" value={summary.students ?? room.student_count} hint="On this roster" />
        <Stat label="Assignments" value={summary.assignments ?? room.assignment_count} hint="Sent to this class" />
        <Stat label="Class accuracy" value={`${summary.average_accuracy || 0}%`} hint="Best attempt per assignment" />
        <Stat label="Completions" value={`${summary.completions || 0}/${summary.possible_completions || 0}`} hint="Roster assignment completions" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Roster</div>
              <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Students</h2>
            </div>
            <Users className="h-5 w-5 text-emerald-300" />
          </div>

          {room.students.length ? (
            <div className="mt-5 space-y-2">
              {room.students.map((student) => {
                const stats = analytics?.students?.find((row) => row.player_id === student.player_id);
                return (
                  <div key={student.player_id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-sm font-black text-emerald-300">{student.name?.charAt(0)?.toUpperCase() || "?"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-slate-200">{student.name}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {student.registered ? "Signed in" : "Guest"}
                        {stats ? ` · ${stats.completed}/${stats.assigned} completed${stats.accuracy == null ? "" : ` · ${stats.accuracy}%`}` : ""}
                      </div>
                    </div>
                    <button onClick={() => removeStudent(student)} aria-label={`Remove ${student.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-rose-500/20 text-rose-300/80 hover:bg-rose-500/10"><UserMinus className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-800 p-9 text-center text-sm text-slate-500">No students yet. Share the class join link or code.</div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300"><BarChart3 className="h-4 w-4" /> Class analytics</div>
          <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Words needing practice</h2>
          <p className="mt-2 text-sm text-slate-500">Based on each student’s best assignment attempt.</p>

          {topMissed.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {topMissed.map((item) => (
                <span key={item.word} className="rounded-full border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-sm font-semibold text-rose-200">{item.word} <span className="ml-1 text-xs text-rose-400/70">×{item.misses}</span></span>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">Missed-word analytics will appear after students submit class assignments.</div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={createAssignment} className="rounded-3xl border border-slate-800 bg-slate-900/45 p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Class assignment</div>
          <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Assign spelling work</h2>
          <p className="mt-2 text-sm text-slate-500">Students who joined this class will see it automatically on the class page.</p>

          <label className="mt-5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="Week 8 spelling" className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-500/50" />
          </label>

          <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Words
            <textarea value={wordsText} onChange={(event) => setWordsText(event.target.value)} rows={8} spellCheck={false} autoCorrect="off" autoCapitalize="none" placeholder={"necessary\nseparate\ncalendar\nembarrass\naccommodation"} className="mt-2 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-sm leading-7 text-slate-100 outline-none focus:border-amber-500/50" />
          </label>
          <div className={words.length >= 5 && words.length <= 50 ? "mt-2 text-xs font-bold text-emerald-300" : "mt-2 text-xs text-slate-500"}>{words.length} unique words · use 5–50</div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Due date
              <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none" />
            </label>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Attempts</div>
              <div className="mt-2 flex gap-2">
                {ATTEMPTS.map((value) => <button key={value} type="button" onClick={() => setAttempts(value)} className={attempts === value ? "flex-1 rounded-xl bg-indigo-500 px-3 py-3 text-sm font-black text-white" : "flex-1 rounded-xl border border-slate-700 px-3 py-3 text-sm font-bold text-slate-300"}>{value}</button>)}
              </div>
            </div>
          </div>

          <button type="submit" disabled={busy || !title.trim() || words.length < 5 || words.length > 50} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950 hover:bg-amber-400 disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Assign to {room.name}
          </button>
        </form>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/35 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">Classwork</div>
              <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Assignments</h2>
            </div>
            <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-400">{room.assignments.length}</span>
          </div>

          {room.assignments.length ? (
            <div className="mt-5 space-y-3">
              {room.assignments.map((assignment) => (
                <article key={assignment.code} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-heading text-lg font-bold text-slate-100">{assignment.title}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>{assignment.word_count} words</span>
                        <span>{assignment.completed_students || 0}/{assignment.roster_students || room.student_count} students completed</span>
                        <span>{prettyDue(assignment.due_at)}</span>
                      </div>
                    </div>
                    <span className={assignment.status === "active" ? "rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-300" : "rounded-full bg-slate-700/40 px-2 py-1 text-[10px] font-black uppercase text-slate-400"}>{assignment.status}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a href={`/assignment/${assignment.code}`} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300">Student view</a>
                    <a href={`/assignments/${assignment.code}/report`} className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300">Report</a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-800 p-9 text-center text-sm text-slate-500">No class assignments yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-3 font-heading text-3xl font-black text-slate-50">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}
