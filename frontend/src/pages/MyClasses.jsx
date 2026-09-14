import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  GraduationCap,
  Loader2,
  LogIn,
  RefreshCcw,
  School,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";

function dueTime(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function dueLabel(value) {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No due date" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function MyClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setClasses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/my/classes");
      setClasses(data.classes || []);
    } catch (error) {
      toast.error(apiError(error, "Could not load your classes."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const assignments = useMemo(() => classes
    .flatMap((schoolClass) => (schoolClass.assignments || []).map((assignment) => ({
      ...assignment,
      classCode: schoolClass.code,
      className: schoolClass.name,
    })))
    .filter((assignment) => assignment.status === "active")
    .sort((a, b) => dueTime(a.due_at) - dueTime(b.due_at)), [classes]);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-950 p-8 text-center sm:p-12">
        <School className="mx-auto h-12 w-12 text-indigo-300" />
        <h1 className="mt-5 font-heading text-4xl font-black text-slate-50">My Classes</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-400">Sign in to keep your class rosters and teacher assignments available across devices.</p>
        <Link to="/signin" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"><LogIn className="h-4 w-4" /> Sign in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-emerald-950/20 p-7 sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300"><GraduationCap className="h-3.5 w-3.5" /> Student · My Classes</span>
            <h1 className="mt-4 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">Your classes and classwork.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">Classes you join with your signed-in account stay here. New teacher assignments appear automatically.</p>
          </div>
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-300 hover:text-white disabled:opacity-50"><RefreshCcw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh</button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Classes" value={loading ? "…" : classes.length} hint="Active rosters" />
        <Stat label="Active classwork" value={loading ? "…" : assignments.length} hint="Assignments available now" />
        <Stat label="Account" value="Synced" hint="Available across signed-in devices" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-7">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Rosters</div>
          <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">My classes</h2>

          {loading ? (
            <div className="grid place-items-center py-16 text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : classes.length ? (
            <div className="mt-5 space-y-3">
              {classes.map((schoolClass) => (
                <Link key={schoolClass.code} to={`/class/${schoolClass.code}`} className="group flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/55 p-4 transition hover:border-emerald-500/30">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300"><School className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-heading text-lg font-bold text-slate-100">{schoolClass.name}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {schoolClass.year_level && <span>{schoolClass.year_level}</span>}
                      <span>{schoolClass.teacher_name}</span>
                      <span>{schoolClass.student_count} students</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-black tracking-widest text-amber-300">{schoolClass.code}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-800 p-9 text-center text-sm text-slate-500">
              You haven’t joined a class yet. <Link to="/join" className="font-bold text-amber-400 hover:text-amber-300">Enter your teacher’s class code →</Link>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/35 p-6 sm:p-7">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Coming up</div>
          <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Class assignments</h2>

          {loading ? (
            <div className="grid place-items-center py-16 text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : assignments.length ? (
            <div className="mt-5 space-y-3">
              {assignments.map((assignment) => {
                const overdue = Number.isFinite(dueTime(assignment.due_at)) && dueTime(assignment.due_at) < Date.now();
                return (
                  <article key={`${assignment.classCode}-${assignment.code}`} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-heading text-lg font-bold text-slate-100">{assignment.title}</div>
                        <div className="mt-1 text-xs font-semibold text-indigo-300">{assignment.className}</div>
                        <div className={overdue ? "mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-rose-300" : "mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500"}><CalendarClock className="h-3.5 w-3.5" /> {overdue ? "Past due · " : ""}{dueLabel(assignment.due_at)}</div>
                      </div>
                      <span className="rounded-full border border-slate-800 px-2 py-1 text-[10px] font-black text-slate-500">{assignment.word_count} words</span>
                    </div>
                    <Link to={`/assignment/${assignment.code}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400">Open assignment <ArrowRight className="h-4 w-4" /></Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-800 p-9 text-center text-sm text-slate-500">No active class assignments right now.</div>
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
