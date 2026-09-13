import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Clock,
  Copy,
  Flame,
  GraduationCap,
  Home,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  Trophy,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { DIFFICULTY_META } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { evaluateAchievements } from "@/lib/achievements";
import { speak, playTone } from "@/lib/speech";
import { BeeMascot } from "@/components/BeeMascot";
import { EndgameHero, HighlightCard } from "@/components/Celebration";
import { Eyebrow, GhostButton, PrimaryButton } from "@/components/ui-bits";

function performanceFor(pct) {
  if (pct === 100) return {
    tier: "Flawless round",
    note: "Every word correct. That deserves confetti.",
    mood: "cheer",
    accent: "text-amber-300",
  };
  if (pct >= 90) return {
    tier: "Podium form",
    note: "You’re spelling with serious consistency.",
    mood: "cheer",
    accent: "text-emerald-300",
  };
  if (pct >= 75) return {
    tier: "Strong session",
    note: "A few misses are all that separate you from the next level.",
    mood: "happy",
    accent: "text-sky-300",
  };
  if (pct >= 55) return {
    tier: "Good training",
    note: "Review the misses below and the next run should jump.",
    mood: "idle",
    accent: "text-indigo-300",
  };
  return {
    tier: "Building momentum",
    note: "The useful part of a hard round is knowing exactly what to practise next.",
    mood: "sad",
    accent: "text-rose-300",
  };
}

export default function ResultsV2() {
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
        <PrimaryButton className="mt-6" onClick={() => navigate("/practice")}>Start practising</PrimaryButton>
      </div>
    );
  }

  const total = summary.correct.length + summary.incorrect.length;
  const correct = summary.correct.length;
  const incorrect = summary.incorrect.length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const performance = performanceFor(pct);
  const difficultyLabel = summary.difficulty === "mixed"
    ? "Mixed"
    : DIFFICULTY_META[summary.difficulty]?.label || summary.difficulty;

  const tryAgainParams = new URLSearchParams({
    mode: summary.mode,
    difficulty: summary.difficulty === "mixed" ? "medium" : summary.difficulty,
  });

  const recommendation = incorrect === 0
    ? { title: "Raise the challenge", body: "You cleared every word. Try the next level or switch to Speed Mode.", action: "Choose a harder round", to: "/practice" }
    : pct >= 75
    ? { title: "Clean up the misses", body: `${incorrect} word${incorrect === 1 ? "" : "s"} stopped this from being flawless. Drill them while they're fresh.`, action: "Practice mistakes", to: `/practice?mode=mistakes&difficulty=${summary.difficulty === "mixed" ? "medium" : summary.difficulty}` }
    : { title: "Rebuild, then retry", body: "Spend one focused round on your missed words, then come back to this level.", action: "Start mistake mode", to: `/practice?mode=mistakes&difficulty=${summary.difficulty === "mixed" ? "medium" : summary.difficulty}` };

  const share = async () => {
    const blocks = `${"🟩".repeat(correct)}${"🟥".repeat(incorrect)}`;
    const text = `🐝 SpellBee · ${difficultyLabel}\n${correct}/${total} · ${pct}% · ${summary.points ?? 0} pts\n${blocks}`;
    try {
      if (navigator.share) await navigator.share({ title: "SpellBee result", text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Result copied!");
      }
    } catch (error) {
      if (error?.name !== "AbortError") toast.error("Could not share the result.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <EndgameHero
        eyebrow="Session complete"
        title={performance.tier}
        subtitle={performance.note}
        celebrate={pct >= 85}
      >
        <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="flex items-center justify-center gap-5 lg:justify-start">
            <BeeMascot size={108} mood={performance.mood} />
            <div
              className="relative grid h-32 w-32 place-items-center rounded-full p-2"
              style={{
                background: `conic-gradient(rgb(245 158 11) ${pct * 3.6}deg, rgb(30 41 59) 0deg)`,
              }}
            >
              <div className="grid h-full w-full place-items-center rounded-full bg-slate-950 text-center">
                <div>
                  <div className="font-heading text-3xl font-black text-slate-50">{pct}%</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">accuracy</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-xs font-semibold text-slate-300">{difficultyLabel}</span>
              <span className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1 text-xs font-semibold text-slate-300">{summary.modeLabel || summary.mode}</span>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">{correct}/{total} correct</span>
            </div>
            <div className="mt-4 text-3xl tracking-[0.14em] sm:text-4xl">
              {Array.from({ length: total }, (_, index) => index < correct ? "🟩" : "🟥").join("")}
            </div>
          </div>
        </div>
      </EndgameHero>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <HighlightCard icon={Star} label="Points" value={summary.points ?? 0} accent="text-amber-300" />
        <HighlightCard icon={Trophy} label="Correct" value={correct} accent="text-emerald-300" />
        <HighlightCard icon={X} label="Incorrect" value={incorrect} accent="text-rose-300" />
        <HighlightCard icon={Target} label="Accuracy" value={`${pct}%`} accent="text-sky-300" />
        <HighlightCard icon={Flame} label="Best streak" value={summary.bestStreak || 0} accent="text-orange-300" />
        <HighlightCard icon={Clock} label="Avg response" value={`${(summary.avgTime || 0).toFixed(1)}s`} accent="text-violet-300" />
      </section>

      <section className="grid gap-4 rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 to-slate-950 p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" /> Best next move
          </div>
          <h2 className="mt-2 font-heading text-2xl font-black text-slate-50">{recommendation.title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">{recommendation.body}</p>
        </div>
        <PrimaryButton onClick={() => navigate(recommendation.to)}>
          {recommendation.action} <ArrowRight className="h-4 w-4" />
        </PrimaryButton>
      </section>

      <section className="flex flex-wrap gap-2">
        <PrimaryButton onClick={share}><Copy className="h-4 w-4" /> Share result</PrimaryButton>
        <GhostButton onClick={() => navigate(`/practice?${tryAgainParams}`)}><RotateCcw className="h-4 w-4" /> Same round</GhostButton>
        <GhostButton onClick={() => navigate("/practice")}><GraduationCap className="h-4 w-4" /> Choose level</GhostButton>
        <GhostButton onClick={() => navigate("/")}><Home className="h-4 w-4" /> Home</GhostButton>
      </section>

      {unlocked.length > 0 && (
        <section className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-6">
          <Eyebrow>Achievement unlocked</Eyebrow>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {unlocked.map((achievement) => (
              <div key={achievement.id} className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-slate-950/50 px-4 py-3">
                <span className="text-3xl">{achievement.emoji}</span>
                <div>
                  <div className="font-heading text-lg font-bold text-slate-100">{achievement.title}</div>
                  <div className="text-xs text-slate-400">{achievement.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {incorrect > 0 && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Eyebrow>Review</Eyebrow>
              <h2 className="mt-1 font-heading text-2xl font-bold text-slate-100">Words that cost you points</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/practice?mode=mistakes&difficulty=${summary.difficulty === "mixed" ? "medium" : summary.difficulty}`)}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-200 hover:bg-rose-500/20"
            >
              Drill all misses
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {summary.incorrect.map((word, index) => (
              <article key={`${word.word}-${index}`} className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xl font-semibold tracking-wider text-rose-100">{word.word}</span>
                  <button
                    type="button"
                    aria-label={`Hear ${word.word}`}
                    onClick={() => speak(word.word, { rate: settings.rate, voiceName: settings.voiceName, voiceLang: settings.voiceLang })}
                    className="grid h-9 w-9 place-items-center rounded-full border border-slate-700 text-slate-300 hover:text-amber-300"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-300">{word.definition}</p>
                {word.example && <p className="mt-1 text-sm italic text-slate-500">“{word.example}”</p>}
                {word.spellingTip && <p className="mt-3 text-xs text-amber-300">💡 {word.spellingTip}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {correct > 0 && (
        <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Words you nailed</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.correct.map((word, index) => (
              <span key={`${word.word}-${index}`} className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-200">
                {word.word}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
