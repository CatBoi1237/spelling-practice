import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Target, Flame, Clock, RotateCcw, GraduationCap } from "lucide-react";
import { DIFFICULTY_META } from "@/data/words";
import { cn } from "@/lib/utils";

export default function Results() {
  const navigate = useNavigate();
  const summary = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("sb.lastSession") || "null");
    } catch {
      return null;
    }
  }, []);

  if (!summary) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center">
        <h2 className="font-heading text-2xl font-bold text-slate-100">No results yet</h2>
        <p className="mt-2 text-slate-400">Complete a practice session to see your scorecard.</p>
        <button
          data-testid="results-go-home"
          onClick={() => navigate("/")}
          className="mt-6 rounded-lg bg-amber-500 px-5 py-2 font-semibold text-slate-950 hover:bg-amber-400"
        >
          Start practising
        </button>
      </div>
    );
  }

  const total = summary.correct.length + summary.incorrect.length;
  const pct = total ? Math.round((summary.correct.length / total) * 100) : 0;

  const grade =
    pct === 100 ? { tier: "Master Wordsmith", note: "Flawless.", color: "text-amber-300" } :
    pct >= 85 ? { tier: "S Tier", note: "Championship material.", color: "text-emerald-300" } :
    pct >= 70 ? { tier: "A Tier", note: "Excellent work.", color: "text-emerald-300" } :
    pct >= 50 ? { tier: "B Tier", note: "Solid — keep going.", color: "text-sky-300" } :
    { tier: "Keep practising", note: "Every miss makes you sharper.", color: "text-rose-300" };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-8 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/80">Scorecard</span>
            <h1 className={cn("mt-2 font-heading text-4xl font-black tracking-tight sm:text-5xl", grade.color)}>{grade.tier}</h1>
            <p className="mt-2 text-slate-400">{grade.note}</p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300">
            {summary.difficulty === "mixed" ? "Mixed" : DIFFICULTY_META[summary.difficulty]?.label} · {summary.mode}
          </span>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric testId="metric-accuracy" icon={Target} label="Accuracy" value={`${pct}%`} accent="text-sky-300" />
          <Metric testId="metric-correct" icon={Trophy} label="Correct" value={summary.correct.length} accent="text-emerald-300" />
          <Metric testId="metric-streak" icon={Flame} label="Best streak" value={summary.bestStreak} accent="text-orange-300" />
          <Metric testId="metric-avg-time" icon={Clock} label="Avg time" value={`${summary.avgTime.toFixed(1)}s`} accent="text-amber-300" />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            data-testid="try-again-button"
            onClick={() => navigate(`/practice?mode=${summary.mode}&difficulty=${summary.difficulty === "mixed" ? "medium" : summary.difficulty}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-slate-950 hover:bg-amber-400"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
          {summary.incorrect.length > 0 && (
            <button
              data-testid="practice-mistakes-button"
              onClick={() => navigate(`/practice?mode=classic&list=missed`)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-2.5 font-semibold text-slate-200 hover:border-amber-500/40 hover:text-amber-300"
            >
              <GraduationCap className="h-4 w-4" /> Practise mistakes
            </button>
          )}
          <button
            data-testid="results-home-button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-5 py-2.5 font-semibold text-slate-300 hover:border-slate-700"
          >
            Home
          </button>
        </div>
      </div>

      {summary.incorrect.length > 0 && (
        <section>
          <h2 className="font-heading text-2xl font-bold text-slate-100">Words you missed</h2>
          <p className="mt-1 text-sm text-slate-400">Review the correct spellings and definitions below.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {summary.incorrect.map((w) => (
              <div
                key={w.word}
                data-testid={`missed-word-${w.word}`}
                className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xl font-semibold text-rose-100 tracking-widest">{w.word}</span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                    {DIFFICULTY_META[w.difficulty]?.label}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{w.definition}</p>
                <p className="mt-1 text-sm italic text-slate-400">&ldquo;{w.example}&rdquo;</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {summary.correct.length > 0 && (
        <section>
          <h2 className="font-heading text-2xl font-bold text-slate-100">Words you nailed</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.correct.map((w) => (
              <span
                key={w.word}
                className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200"
              >
                {w.word}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ testId, icon: Icon, label, value, accent }) {
  return (
    <div data-testid={testId} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</span>
        <Icon className={cn("h-4 w-4", accent)} />
      </div>
      <div className="mt-2 font-heading text-3xl font-black text-slate-50">{value}</div>
    </div>
  );
}
