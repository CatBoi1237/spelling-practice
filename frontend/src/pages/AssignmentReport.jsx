import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, Download, Loader2, RefreshCcw, Users } from "lucide-react";
import { toast } from "sonner";

import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function prettyDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

export default function AssignmentReport() {
  const { code } = useParams();
  const assignmentCode = (code || "").toUpperCase();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/assignments/${assignmentCode}/report`);
      setReport(data);
      setError("");
    } catch (err) {
      setError(apiError(err, "Could not load this assignment report."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentCode, user?.id]);

  const attemptsByPlayer = useMemo(() => {
    const map = new Map();
    (report?.submissions || []).forEach((row) => {
      map.set(row.player_id, (map.get(row.player_id) || 0) + 1);
    });
    return map;
  }, [report]);

  const exportCsv = () => {
    if (!report?.best_submissions?.length) {
      toast.error("There are no student results to export yet.");
      return;
    }
    const rows = [
      ["Student", "Best accuracy", "Correct", "Total", "Average response (s)", "Attempts", "Missed words", "Late", "Submitted"],
      ...report.best_submissions.map((row) => [
        row.name,
        `${row.accuracy}%`,
        row.correct,
        row.total,
        ((row.avg_time_ms || 0) / 1000).toFixed(2),
        attemptsByPlayer.get(row.player_id) || 1,
        (row.missed || []).map((item) => item.word).join("; "),
        row.late ? "Yes" : "No",
        row.submitted_at,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `spellbee-assignment-${assignmentCode}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  };

  if (!user) {
    return <div className="mx-auto max-w-lg rounded-3xl border border-amber-500/25 bg-slate-900/60 p-8 text-center"><h1 className="font-heading text-3xl font-black text-slate-50">Teacher report</h1><p className="mt-3 text-sm text-slate-400">Sign in with the teacher account that created this assignment.</p><Link to="/signin" className="mt-6 inline-flex rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950">Sign in</Link></div>;
  }

  if (loading) return <div className="grid place-items-center py-24 text-slate-500"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  if (error || !report) return <div className="mx-auto max-w-lg rounded-3xl border border-rose-500/25 bg-rose-500/10 p-8 text-center text-rose-200">{error || "Report unavailable"}</div>;

  const { assignment, summary, best_submissions: students } = report;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/assignments" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-amber-300"><ArrowLeft className="h-4 w-4" /> Assignments</Link>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300"><RefreshCcw className="h-4 w-4" /> Refresh</button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950"><Download className="h-4 w-4" /> Export CSV</button>
        </div>
      </div>

      <header className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-950 p-7 sm:p-9">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">Assignment report · {assignment.code}</div>
        <h1 className="mt-2 font-heading text-4xl font-black text-slate-50">{assignment.title}</h1>
        <p className="mt-2 text-sm text-slate-400">{assignment.word_count} words · {assignment.attempts_allowed} attempt{assignment.attempts_allowed === 1 ? "" : "s"} allowed</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Users} label="Students" value={summary.students} />
        <Stat icon={BarChart3} label="Class accuracy" value={`${summary.class_accuracy}%`} />
        <Stat icon={RefreshCcw} label="Submissions" value={summary.submissions} />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/35">
        <div className="border-b border-slate-800 px-5 py-4"><h2 className="font-heading text-xl font-bold text-slate-50">Best result per student</h2><p className="mt-1 text-xs text-slate-500">If a student uses multiple attempts, their strongest attempt is shown here.</p></div>
        {!students.length ? (
          <div className="p-10 text-center text-sm text-slate-500">No students have submitted this assignment yet.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {students.map((student) => (
              <div key={student.player_id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_1.4fr] sm:items-center">
                <div><div className="font-bold text-slate-100">{student.name}</div><div className="mt-1 text-xs text-slate-500">{attemptsByPlayer.get(student.player_id) || 1} attempt{(attemptsByPlayer.get(student.player_id) || 1) === 1 ? "" : "s"}{student.late ? " · late" : ""}</div></div>
                <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-600">Accuracy</div><div className="mt-1 font-mono font-black text-emerald-300">{student.accuracy}%</div></div>
                <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-600">Score</div><div className="mt-1 font-mono text-slate-200">{student.correct}/{student.total}</div></div>
                <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-600">Avg time</div><div className="mt-1 font-mono text-slate-200">{((student.avg_time_ms || 0) / 1000).toFixed(1)}s</div></div>
                <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-600">Missed</div><div className="mt-1 text-xs text-rose-300">{student.missed?.length ? student.missed.map((item) => item.word).join(", ") : "None 🎉"}</div><div className="mt-1 text-[10px] text-slate-600">{prettyDate(student.submitted_at)}</div></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"><Icon className="h-4 w-4 text-amber-400" />{label}</div><div className="mt-3 font-heading text-3xl font-black text-slate-50">{value}</div></div>;
}
