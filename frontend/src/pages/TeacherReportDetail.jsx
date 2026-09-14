import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  Loader2,
  Target,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { api, apiError } from "@/lib/api";

function dateLabel(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function seconds(value) {
  return value ? `${(Number(value) / 1000).toFixed(1)}s` : "—";
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function TeacherReportDetail() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/teacher/classroom-reports/${encodeURIComponent(reportId)}`)
      .then(({ data }) => {
        if (alive) setReport(data);
      })
      .catch((error) => toast.error(apiError(error, "Could not load this Classroom report.")))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reportId]);

  const exportCsv = () => {
    if (!report) return;
    const rows = [["Student", "Correct", "Answered", "Accuracy", "Average response (s)", "Points"]];
    for (const student of report.summary?.student_results || []) {
      rows.push([
        student.name,
        student.correct,
        student.answered,
        `${student.accuracy}%`,
        student.avg_time_ms ? (student.avg_time_ms / 1000).toFixed(2) : "",
        student.points,
      ]);
    }
    rows.push([]);
    rows.push(["Round", "Word", "Student", "Answer", "Correct", "Response (s)", "Points"]);
    for (const round of report.rounds || []) {
      for (const student of round.students || []) {
        rows.push([
          Number(round.round_index) + 1,
          round.word,
          student.name,
          student.answer || "",
          student.answered ? (student.correct ? "Yes" : "No") : "No answer",
          student.time_ms ? (student.time_ms / 1000).toFixed(2) : "",
          student.points || 0,
        ]);
      }
    }

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `spellbee-classroom-${report.code}-${String(report.finished_at || "").slice(0, 10) || "report"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Classroom CSV exported.");
  };

  if (loading) {
    return <div className="grid place-items-center py-24 text-slate-500"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rose-500/25 bg-rose-500/5 p-8 text-center">
        <h1 className="font-heading text-3xl font-black text-slate-50">Report not found</h1>
        <Link to="/teacher/reports" className="mt-6 inline-flex rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950">Back to reports</Link>
      </div>
    );
  }

  const summary = report.summary || {};
  const students = summary.student_results || [];
  const missed = summary.top_missed_words || [];

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-amber-950/20 p-7 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Link to="/teacher/reports" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-300 hover:text-indigo-200"><ArrowLeft className="h-4 w-4" /> All reports</Link>
            <div className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">Classroom report</div>
            <h1 className="mt-2 font-heading text-4xl font-black text-slate-50 sm:text-5xl">Room {report.code}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
              <span>{dateLabel(report.finished_at)}</span>
              <span className="capitalize">{report.difficulty || "mixed"}</span>
              <span>{summary.rounds || 0} rounds</span>
              {report.ended_early && <span className="font-bold text-rose-300">Ended early</span>}
            </div>
          </div>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950 hover:bg-amber-400">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="Students" value={summary.students || 0} hint="In this saved session" />
        <Stat icon={Target} label="Class accuracy" value={`${summary.accuracy || 0}%`} hint={`${summary.correct || 0}/${summary.answers || 0} correct answers`} />
        <Stat icon={Clock3} label="Avg response" value={seconds(summary.avg_time_ms)} hint="Answered words only" />
        <Stat icon={Trophy} label="Top score" value={students[0]?.points?.toLocaleString?.() || students[0]?.points || 0} hint={students[0]?.name || "No scores yet"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-7">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Leaderboard & results</div>
          <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Students</h2>

          {students.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="pb-3 pr-4">Student</th>
                    <th className="pb-3 pr-4">Accuracy</th>
                    <th className="pb-3 pr-4">Correct</th>
                    <th className="pb-3 pr-4">Avg response</th>
                    <th className="pb-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {students.map((student, index) => (
                    <tr key={student.player_id}>
                      <td className="py-3 pr-4 font-semibold text-slate-200"><span className="mr-2 text-slate-600">#{index + 1}</span>{student.name}</td>
                      <td className="py-3 pr-4 font-bold text-emerald-300">{student.accuracy}%</td>
                      <td className="py-3 pr-4 text-slate-400">{student.correct}/{student.answered}</td>
                      <td className="py-3 pr-4 text-slate-400">{seconds(student.avg_time_ms)}</td>
                      <td className="py-3 text-right font-mono font-black text-amber-300">{Number(student.points || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">No student results were recorded.</div>
          )}
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-7">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-300">Review</div>
          <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Most-missed words</h2>
          {missed.length ? (
            <div className="mt-5 space-y-2">
              {missed.map((item) => (
                <div key={item.word} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
                  <span className="font-semibold text-slate-200">{item.word}</span>
                  <span className="rounded-full bg-rose-500/10 px-2 py-1 text-xs font-black text-rose-300">{item.misses} misses</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">No missed words recorded.</div>
          )}
        </aside>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/35 p-6 sm:p-7">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">Round breakdown</div>
        <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Every word</h2>

        <div className="mt-5 space-y-4">
          {(report.rounds || []).map((round) => (
            <article key={round.round_index} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-600">Round {Number(round.round_index) + 1}</div>
                  <div className="mt-1 font-heading text-2xl font-black text-amber-300">{round.word}</div>
                </div>
                <div className="text-xs text-slate-500">{dateLabel(round.revealed_at)}</div>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {(round.students || []).map((student) => (
                  <div key={student.player_id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3">
                    {student.answered ? (student.correct ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <XCircle className="h-4 w-4 shrink-0 text-rose-400" />) : <span className="h-4 w-4 shrink-0 rounded-full border border-slate-700" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-200">{student.name}</div>
                      <div className="truncate text-[11px] text-slate-500">{student.answered ? `“${student.answer || ""}” · ${seconds(student.time_ms)}` : "No answer"}</div>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-300">+{student.points || 0}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-amber-400" />
      </div>
      <div className="mt-3 font-heading text-3xl font-black text-slate-50">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}
