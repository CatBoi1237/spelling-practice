import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  Cloud,
  Loader2,
  RefreshCcw,
  Target,
  Users,
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

export default function TeacherReports() {
  const [reports, setReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [reportsResult, analyticsResult] = await Promise.all([
        api.get("/teacher/classroom-reports"),
        api.get("/teacher/classroom-analytics"),
      ]);
      setReports(reportsResult.data.reports || []);
      setAnalytics(analyticsResult.data || null);
    } catch (error) {
      toast.error(apiError(error, "Could not load Classroom reports."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const missed = analytics?.top_missed_words || [];

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-amber-950/20 p-7 sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">
              <Cloud className="h-3.5 w-3.5" /> Cloud Classroom reports
            </span>
            <h1 className="mt-4 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">Live class history, on every device.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
              Finished Classroom games are saved to your Teacher account with student results, response times and words the class found difficult.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-300 hover:text-white disabled:opacity-50"
          >
            <RefreshCcw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Cloud} label="Saved sessions" value={loading ? "…" : analytics?.sessions || 0} hint="Stored in your Teacher account" />
        <Stat icon={Target} label="Accuracy" value={loading ? "…" : `${analytics?.accuracy || 0}%`} hint="Across saved Classroom answers" />
        <Stat icon={Clock3} label="Avg response" value={loading ? "…" : seconds(analytics?.avg_time_ms)} hint="Answered words only" />
        <Stat icon={Users} label="Student results" value={loading ? "…" : analytics?.student_results?.length || 0} hint="Unique students in cloud history" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">History</div>
              <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Classroom sessions</h2>
            </div>
            <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-400">{reports.length} saved</span>
          </div>

          {loading ? (
            <div className="grid place-items-center py-20 text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : reports.length ? (
            <div className="mt-5 space-y-3">
              {reports.map((report) => (
                <Link
                  key={report.report_id}
                  to={`/teacher/reports/${encodeURIComponent(report.report_id)}`}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/55 p-4 transition hover:border-indigo-500/35"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
                    <BarChart3 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black tracking-widest text-amber-300">{report.code}</span>
                      {report.ended_early && <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-rose-300">Ended early</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{dateLabel(report.finished_at)}</span>
                      <span>{report.summary?.students ?? report.students?.length ?? 0} students</span>
                      <span>{report.summary?.rounds ?? 0} rounds</span>
                      <span>{report.summary?.accuracy ?? 0}% accuracy</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-indigo-300" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">
              No cloud reports yet. Your next finished Classroom game will appear here automatically.
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-7">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-rose-300">Across live classes</div>
          <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Most-missed words</h2>
          <p className="mt-2 text-sm text-slate-500">Useful candidates for your next list or assignment.</p>

          {missed.length ? (
            <div className="mt-5 space-y-2">
              {missed.slice(0, 12).map((item, index) => (
                <div key={item.word} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-3">
                  <span className="w-6 text-center text-xs font-black text-slate-600">#{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-slate-200">{item.word}</span>
                  <span className="rounded-full bg-rose-500/10 px-2 py-1 text-xs font-black text-rose-300">{item.misses} misses</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">Missed-word trends will appear after live Classroom sessions are completed.</div>
          )}
        </aside>
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
