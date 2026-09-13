import { useMemo } from "react";
import { Check, X, ArrowRight, Repeat, Sparkles, Volume2 } from "lucide-react";
import { DIFFICULTY_META } from "@/data/words";
import { diffChars } from "@/lib/wordmeta";
import { BeeMascot } from "@/components/BeeMascot";
import { cn } from "@/lib/utils";

const CONFETTI = ["#f59e0b", "#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa"];

export function FeedbackCard({ result, points, streak, mastered, onNext, onPracticeAgain, onHear, isLast, showDefinitions = true, showTips = true }) {
  const { isRight, attempt, correct, word, timedOut } = result;
  const diff = useMemo(() => diffChars(attempt, correct), [attempt, correct]);

  if (isRight) {
    return (
      <div data-testid="feedback-correct" className="pop-in relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40" aria-hidden>
          {CONFETTI.map((c, i) => (
            <span key={i} className="confetti-piece" style={{ left: `${8 + i * 15}%`, background: c, animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <BeeMascot mood="cheer" size={88} />
          <div className="flex-1">
            <h3 className="font-heading text-3xl font-black text-slate-50 sm:text-4xl">Correct!</h3>
            <p className="mt-1 text-sm text-slate-300">{streak >= 5 ? "You're unstoppable." : streak >= 3 ? "Great work — keep the streak alive." : "Beautifully spelled."}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span data-testid="points-earned" className="pop-in rounded-full bg-emerald-500 px-3 py-1 text-sm font-black text-emerald-950">+{points} points</span>
              <span data-testid="streak-badge" className="rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-sm font-semibold text-orange-300">🔥 Streak {streak}</span>
              {mastered && (
                <span data-testid="mastered-badge" className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" /> Word mastered
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Info label="Word" value={<span className="font-mono text-lg tracking-widest">{word.word}</span>} />
          {showDefinitions && <Info label="Definition" value={word.definition} />}
        </div>
        <div className="mt-6 flex justify-end">
          <button data-testid="next-word-button" onClick={onNext} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">
            {isLast ? "See results" : "Next word"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="feedback-incorrect" className="shake rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 sm:p-10">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-500 text-rose-950"><X className="h-6 w-6" /></span>
        <div>
          <h3 className="font-heading text-3xl font-black text-slate-50">{timedOut ? "Time's up" : "Not quite"}</h3>
          <p className="text-sm text-slate-300">Here's exactly where it went wrong — learn it now, nail it next time.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-950/60 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Your answer</div>
          <div data-testid="your-answer-diff" className="mt-2 font-mono text-xl tracking-[0.2em]">
            {attempt ? diff.map((c, i) => (
              <span key={i} className={c.ok ? "text-slate-300" : "text-rose-300 underline decoration-rose-400 decoration-2 underline-offset-4"}>{c.user}</span>
            )) : <span className="text-slate-500">—</span>}
          </div>
        </div>
        <div className="rounded-xl bg-slate-950/60 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Correct spelling</div>
          <div data-testid="correct-answer-diff" className="mt-2 font-mono text-xl tracking-[0.2em]">
            {diff.map((c, i) => (
              <span key={i} className={c.ok ? "text-emerald-300" : "rounded bg-emerald-500/20 px-0.5 text-emerald-200"}>{c.char}</span>
            ))}
          </div>
          <button data-testid="hear-word-again-button" onClick={onHear} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300">
            <Volume2 className="h-3.5 w-3.5" /> Hear it again
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {showDefinitions && <Info label="Definition" value={word.definition} full />}
        <Info label="Example" value={<em>“{word.example}”</em>} full />
        {showTips && word.spellingTip && <Info label="Spelling tip" value={word.spellingTip} accent />}
        {word.origin && <Info label="Origin" value={`${word.origin}${word.originNote ? ` — ${word.originNote}` : ""}`} />}
        {word.syllableBreak && <Info label="Syllables" value={<span className="font-mono">{word.syllableBreak}</span>} />}
        <Info label="Difficulty" value={DIFFICULTY_META[word.difficulty]?.label || word.difficulty} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <button data-testid="practice-this-word-button" onClick={onPracticeAgain} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-amber-500/40 hover:text-amber-300">
          <Repeat className="h-4 w-4" /> Practice this word
        </button>
        <button data-testid="next-word-button" onClick={onNext} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400">
          {isLast ? "See results" : "Next word"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Info({ label, value, full, accent }) {
  return (
    <div className={cn("rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3", full && "sm:col-span-2", accent && "border-amber-500/30 bg-amber-500/5")}>
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500/70">{label}</div>
      <div className="mt-1 text-sm text-slate-200">{value}</div>
    </div>
  );
}

export { Check };
