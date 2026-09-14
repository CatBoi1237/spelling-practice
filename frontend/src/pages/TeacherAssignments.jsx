import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  Files,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { getCustomWordLists } from "@/lib/customWordLists";
import { DIFFICULTY_META, WORDS_BY_DIFFICULTY } from "@/data/words";
import AssignmentQrButton from "@/components/AssignmentQrButton";

const SCHOOL_LEVELS = ["grade4", "grade5", "grade6", "year7"];
const COUNTS = [5, 10, 15, 25];
const ATTEMPTS = [1, 2, 3, 5];

function shuffle(values) {
  const items = [...values];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function prettyDue(value) {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No due date" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function TeacherAssignments() {
  const { user } = useAuth();
  const customLists = useMemo(() => getCustomWordLists(), []);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("grade5");
  const [count, setCount] = useState(10);
  const [attempts, setAttempts] = useState(2);
  const [dueAt, setDueAt] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get("/assignments");
      setAssignments(data.assignments || []);
    } catch (error) {
      toast.error(apiError(error, "Could not load assignments."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const selectedList = customLists.find((list) => `list:${list.id}` === source);
  const sourceWords = selectedList
    ? selectedList.words
    : (WORDS_BY_DIFFICULTY[source] || []).map((word) => word.word);
  const effectiveCount = selectedList ? selectedList.words.length : count;

  const visibleAssignments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return assignments.filter((assignment) => {
      if (statusFilter !== "all" && assignment.status !== statusFilter) return false;
      if (!needle) return true;
      return [assignment.title, assignment.code, assignment.level]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [assignments, query, statusFilter]);

  const create = async (event) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Give the assignment a title.");
      return;
    }
    if (sourceWords.length < effectiveCount) {
      toast.error("That source does not have enough words.");
      return;
    }

    setBusy(true);
    try {
      const words = selectedList ? selectedList.words : shuffle(sourceWords).slice(0, effectiveCount);
      const { data } = await api.post("/assignments", {
        title: title.trim(),
        words,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        attempts_allowed: attempts,
        level: selectedList ? "custom" : source,
      });
      setAssignments((current) => [{ ...data, submission_count: 0, student_count: 0 }, ...current]);
      setTitle("");
      setDueAt("");
      toast.success(`Assignment ${data.code} created.`);
    } catch (error) {
      toast.error(apiError(error, "Could not create assignment."));
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (code) => {
    const url = `${window.location.origin}/assignment/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Assignment link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  const duplicate = async (assignment) => {
    const key = `duplicate:${assignment.code}`;
    setActionBusy(key);
    try {
      const { data } = await api.post("/assignments", {
        title: `${assignment.title} (copy)`.slice(0, 80),
        words: assignment.words || [],
        due_at: assignment.due_at || null,
        attempts_allowed: assignment.attempts_allowed || 1,
        level: assignment.level || "custom",
      });
      setAssignments((current) => [{ ...data, submission_count: 0, student_count: 0 }, ...current]);
      toast.success(`Copied as ${data.code}.`);
    } catch (error) {
      toast.error(apiError(error, "Could not duplicate assignment."));
    } finally {
      setActionBusy("");
    }
  };

  const toggle = async (assignment) => {
    setActionBusy(`toggle:${assignment.code}`);
    try {
      const { data } = await api.post(`/assignments/${assignment.code}/status`, {
        enabled: assignment.status !== "active",
      });
      setAssignments((rows) => rows.map((row) => row.code === assignment.code ? { ...row, ...data } : row));
      toast.success(data.status === "active" ? "Assignment reopened." : "Assignment closed.");
    } catch (error) {
      toast.error(apiError(error, "Could not update assignment."));
    } finally {
      setActionBusy("");
    }
  };

  const remove = async (assignment) => {
    if (!window.confirm(`Delete “${assignment.title}” and its student results?`)) return;
    setActionBusy(`delete:${assignment.code}`);
    try {
      await api.delete(`/assignments/${assignment.code}`);
      setAssignments((rows) => rows.filter((row) => row.code !== assignment.code));
      toast.success("Assignment deleted.");
    } catch (error) {
      toast.error(apiError(error, "Could not delete assignment."));
    } finally {
      setActionBusy("");
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-amber-500/25 bg-slate-900/60 p-9 text-center">
        <LockKeyhole className="mx-auto h-10 w-10 text-amber-400" />
        <h1 className="mt-5 font-heading text-3xl font-black text-slate-50">Teacher assignments</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">Sign in to create assignments and view student results. Students can complete an assignment as guests.</p>
        <Link to="/signin" className="mt-6 inline-flex rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-amber-950/20 p-7 sm:p-9">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">Teacher · Assignments</div>
            <h1 className="mt-2 font-heading text-4xl font-black text-slate-50 sm:text-5xl">Send spelling practice home.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">Choose a school level or one of your word lists, share a link, QR code or six-character code, then see completion, accuracy, missed words and response time.</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-300 hover:text-white disabled:opacity-50">
            <RefreshCcw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
          </button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={create} className="rounded-3xl border border-slate-800 bg-slate-900/45 p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-300"><Plus className="h-5 w-5" /></span>
            <div>
              <h2 className="font-heading text-2xl font-bold text-slate-50">Create assignment</h2>
              <p className="text-xs text-slate-500">Words are copied into the assignment when you create it.</p>
            </div>
          </div>

          <label className="mt-6 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="Week 7 spelling homework" className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-500/50" />
          </label>

          <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Word source
            <select value={source} onChange={(event) => setSource(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none">
              {SCHOOL_LEVELS.map((level) => <option key={level} value={level}>{DIFFICULTY_META[level]?.label || level}</option>)}
              {customLists.map((list) => <option key={list.id} value={`list:${list.id}`}>{list.name} · {list.words.length} words</option>)}
            </select>
          </label>

          {!selectedList && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Words</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {COUNTS.map((value) => <button key={value} type="button" onClick={() => setCount(value)} className={count === value ? "rounded-full bg-amber-500 px-3 py-1.5 text-xs font-black text-slate-950" : "rounded-full border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300"}>{value}</button>)}
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Attempts allowed</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {ATTEMPTS.map((value) => <button key={value} type="button" onClick={() => setAttempts(value)} className={attempts === value ? "rounded-full bg-indigo-500 px-3 py-1.5 text-xs font-black text-white" : "rounded-full border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300"}>{value}</button>)}
            </div>
          </div>

          <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Due date <span className="font-normal normal-case tracking-normal text-slate-600">(optional)</span>
            <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none" />
          </label>

          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            <strong className="text-slate-200">{effectiveCount} words</strong> · {selectedList ? selectedList.name : DIFFICULTY_META[source]?.label} · {attempts} attempt{attempts === 1 ? "" : "s"}
          </div>

          <button type="submit" disabled={busy || !title.trim()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950 hover:bg-amber-400 disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />} Create assignment
          </button>
        </form>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/35 p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Your classwork</div>
              <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Assignments</h2>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-400">{assignments.length} total</div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, code or level…"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none focus:border-indigo-500/40"
              />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-300 outline-none">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {loading ? (
            <div className="grid place-items-center py-20 text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : assignments.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">No assignments yet. Create one and share the student link.</div>
          ) : visibleAssignments.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">No assignments match those filters.</div>
          ) : (
            <div className="mt-5 space-y-3">
              {visibleAssignments.map((assignment) => (
                <article key={assignment.code} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-lg font-bold text-slate-100">{assignment.title}</h3>
                        <span className={assignment.status === "active" ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300" : "rounded-full bg-slate-700/40 px-2 py-0.5 text-[10px] font-black uppercase text-slate-400"}>{assignment.status}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-mono font-bold tracking-widest text-amber-300">{assignment.code}</span>
                        <span>{assignment.word_count} words</span>
                        <span>{assignment.student_count || 0} students</span>
                        <span>{assignment.submission_count || 0} submissions</span>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500"><CalendarClock className="h-3.5 w-3.5" /> {prettyDue(assignment.due_at)}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => copyLink(assignment.code)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white"><Copy className="h-3.5 w-3.5" /> Copy link</button>
                    <AssignmentQrButton code={assignment.code} title={assignment.title} />
                    <Link to={`/assignment/${assignment.code}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white"><ExternalLink className="h-3.5 w-3.5" /> Student view</Link>
                    <Link to={`/assignments/${assignment.code}/report`} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300"><BarChart3 className="h-3.5 w-3.5" /> Report</Link>
                    <button onClick={() => duplicate(assignment)} disabled={actionBusy === `duplicate:${assignment.code}`} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs font-bold text-emerald-300 disabled:opacity-40"><Files className="h-3.5 w-3.5" /> Duplicate</button>
                    <button onClick={() => toggle(assignment)} disabled={actionBusy === `toggle:${assignment.code}`} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs font-bold text-amber-300 disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" /> {assignment.status === "active" ? "Close" : "Reopen"}</button>
                    <button onClick={() => remove(assignment)} disabled={actionBusy === `delete:${assignment.code}`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 px-3 py-2 text-xs font-bold text-rose-300 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
