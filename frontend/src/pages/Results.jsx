import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Target, Flame, Clock, RotateCcw, GraduationCap, Star, X, Home, Volume2 } from "lucide-react";
import { DIFFICULTY_META } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { evaluateAchievements } from "@/lib/achievements";
import { speak, playTone } from "@/lib/speech";
import { BeeMascot } from "@/components/BeeMascot";
import { StatCard, PrimaryButton, GhostButton, Eyebrow } from "@/components/ui-bits";
import { cn } from "@/lib/utils";

export default function Results() {
  const navigate = useNavigate();
  const { stats, settings } = useApp();
  const [unlocked, setUnlocked] = useState([]);
  const summary = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("sb.lastSession") || "null");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!summary) return;
    const { newly } = evaluateAchievements(stats);
    if (newly.length) {
      setUnlocked(newly);
      if (settings.soundEffects) playTone("achievement");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  if (!summary) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center">
        <BeeMascot size={80} className="mx-auto" />
        <h2 className="mt-4 font-heading text-2xl font-bold text-slate-100">No results yet</h2>
        <p className="mt-2 text-slate-400">Complete a practice session to see your scorecard.</p>
        <PrimaryButton data-testid="results-go-home" className="mt-6" onClick={() => navigate("/practice")}>Start practising</PrimaryButton>
      </div>
    );
  }

  const total = summary.correct.length + summary.incorrect.length;
  const pct = total ? Math.round((summary.correct.length / total) * 100) : 0;
  const grade =
    pct === 100 ? { tier: "Flawless", note: "Every single word. Champion material.", color: "text-amber-300", mood: "cheer" } :
    pct >= 85 ? { tier: "Outstanding", note: "That's a podium performance.", color: "text-emerald-300", mood: "cheer" } :
    pct >= 70 ? { tier: "Strong round", note: "A few slips — review them below.", color: "text-emerald-300", mood: "happy" } :
    pct >= 50 ? { tier: "Solid effort", note: "Consistency comes with reps. Drill your misses.", color: "text-sky-300", mood: "idle" } :
    { tier: "Keep going", note: "Every miss you study becomes a word you own.", color: "text-rose-300", mood: "sad" };

  const tryAgainParams = new URLSearchParams({ mode: summary.mode, difficulty: summary.difficulty === "mixed" ? "medium" : summary.difficulty });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div data-testid="results-card" className="honeycomb-hero relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-8 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            <BeeMascot size={88} mood={grade.mood} />
            <div>
              <Eyebrow>Session complete</Eyebrow>
              <h1 className={cn("mt-2 font-heading text-4xl font-black tracking-tight sm:text-5xl", grade.color)}>{grade.tier}</h1>
              <p className="mt-2 text-slate-400">{grade.note}</p>
            </div>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-300">
            {summary.difficulty === "mixed" ? "Mixed" : DIFFICULTY_META[summary.difficulty]?.label || summary.difficulty} · {summary.modeLabel || summary.mode}
          </span>
        </div>

        <div className="stagger mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard testId="metric-score" icon={Star} label="Score" value={summary.points ?? 0} accent="text-amber-300" />
          <StatCard testId="metric-correct" icon={Trophy} label="Correct" value={summary.correct.length} accent="text-emerald-300" />
          <StatCard testId="metric-incorrect" icon={X} label="Incorrect" value={summary.incorrect.length} accent="text-rose-300" />
          <StatCard testId="metric-accuracy" icon={Target} label="Accuracy" value={`${pct}%`} accent="text-sky-300" />
          <StatCard testId="metric-streak" icon={Flame} label="Best streak" value={summary.bestStreak} accent="text-orange-300" />
          <StatCard testId="metric-avg-time" icon={Clock} label="Avg time" value={`${(summary.avgTime || 0).toFixed(1)}s`} accent="text-amber-300" />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {summary.incorrect.length > 0 && (
            <PrimaryButton data-testid="practice-mistakes-button" onClick={() => navigate("/practice?mode=mistakes&difficulty=" + (summary.difficulty === "mixed" ? "medium" : summary.difficulty))}>
              <GraduationCap className="h-4 w-4" /> Practice Mistakes
            </PrimaryButton>
          )}
          <GhostButton data-testid="try-again-button" onClick={() => navigate(`/practice?${tryAgainParams}`)}>
            <RotateCcw className="h-4 w-4" /> Try again
          </GhostButton>
          <GhostButton data-testid="results-home-button" onClick={() => navigate("/")}>
            <Home className="h-4 w-4" /> Home
          </GhostButton>
        </div>
      </div>

      {unlocked.length > 0 && (
        <section data-testid="achievements-unlocked" className="pop-in rounded-3xl border border-amber-500/40 bg-amber-500/10 p-6">
          <Eyebrow>Achievement unlocked</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-3">
            {unlocked.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-slate-950/50 px-4 py-3">
                <span className="text-3xl">{a.emoji}</span>
                <div>
                  <div className="font-heading text-lg font-bold text-slate-100">{a.title}</div>
                  <div className="text-xs text-slate-400">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {summary.incorrect.length > 0 && (
        <section>
          <h2 className="font-heading text-2xl font-bold text-slate-100">Words to review</h2>
          <p className="mt-1 text-sm text-slate-400">Read the tip, hear it again, and it'll stick.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {summary.incorrect.map((w, i) => (
              <div key={`${w.word}-${i}`} data-testid={`missed-word-${w.word}`} className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xl font-semibold tracking-widest text-rose-100">{w.word}</span>
                  <div className="flex items-center gap-2">
                    <button aria-label={`Hear ${w.word}`} onClick={() => speak(w.word, { rate: settings.rate, voiceName: settings.voiceName, voiceLang: settings.voiceLang })} className="grid h-8 w-8 place-items-center rounded-full border border-slate-700 text-slate-300 hover:text-amber-300"><Volume2 className="h-4 w-4" /></button>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">{DIFFICULTY_META[w.difficulty]?.label}</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-300">{w.definition}</p>
                <p className="mt-1 text-sm italic text-slate-400">“{w.example}”</p>
                {w.spellingTip && <p className="mt-2 text-xs text-amber-300">💡 {w.spellingTip}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {summary.correct.length > 0 && (
        <section>
          <h2 className="font-heading text-2xl font-bold text-slate-100">Words you nailed</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.correct.map((w, i) => (
              <span key={`${w.word}-${i}`} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200">{w.word}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
