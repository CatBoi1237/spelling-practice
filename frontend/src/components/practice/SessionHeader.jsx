import { ArrowLeft, Flame, Heart, Timer, Star } from "lucide-react";
import { DIFFICULTY_META } from "@/data/words";
import { cn } from "@/lib/utils";

export function SessionHeader({ mode, difficulty, index, total, streak, timeLeft, lives, points, onExit }) {
  const pct = total ? Math.min(100, ((index + 1) / total) * 100) : 0;
  const diffLabel = mode.mixed || difficulty === "mixed" ? "Mixed" : DIFFICULTY_META[difficulty]?.label || difficulty;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            data-testid="exit-session-button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-rose-500/40 hover:text-rose-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Exit
          </button>
          <span data-testid="session-mode-label" className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            {mode.label} · {diffLabel}
          </span>
          {lives != null && (
            <span data-testid="lives-indicator" className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
              <Heart className="h-3 w-3 fill-current" /> {lives}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
          <span data-testid="word-progress">{total ? `Word ${index + 1} of ${total}` : `Word ${index + 1}`}</span>
          {timeLeft != null && (
            <span data-testid="timer-display" className={cn("flex items-center gap-1 font-mono", timeLeft <= 5 ? "text-rose-300" : "text-slate-300")}>
              <Timer className="h-3.5 w-3.5" /> {timeLeft}s
            </span>
          )}
          <span data-testid="session-points" className="flex items-center gap-1 text-amber-300">
            <Star className="h-3.5 w-3.5 fill-current" /> {points}
          </span>
          <span data-testid="session-streak" className={cn("flex items-center gap-1", streak >= 3 ? "text-orange-300" : "text-slate-400")}>
            <Flame className={cn("h-3.5 w-3.5", streak >= 3 && "fill-current")} /> {streak}
          </span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-900" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-[width] duration-500" style={{ width: total ? `${pct}%` : "100%" }} />
      </div>
    </div>
  );
}
