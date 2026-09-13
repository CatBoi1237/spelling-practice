import { Wand2 } from "lucide-react";
import {
  BEE_LEVEL_IDS,
  DIFFICULTY_META,
  SCHOOL_LEVEL_IDS,
  WORDS_BY_DIFFICULTY,
} from "@/data/words";
import { cn } from "@/lib/utils";

const STYLE = {
  grade4: "ring-emerald-500/40 text-emerald-300",
  grade5: "ring-teal-500/40 text-teal-300",
  grade6: "ring-cyan-500/40 text-cyan-300",
  year7: "ring-sky-500/40 text-sky-300",
  easy: "ring-indigo-500/40 text-indigo-300",
  medium: "ring-violet-500/40 text-violet-300",
  hard: "ring-amber-500/40 text-amber-300",
  extreme: "ring-rose-500/40 text-rose-300",
};

function LevelCard({ id, selected, onSelect }) {
  const meta = DIFFICULTY_META[id];
  const count = WORDS_BY_DIFFICULTY[id]?.length || 0;

  return (
    <button
      type="button"
      data-testid={`difficulty-${id}-card`}
      onClick={() => onSelect(id)}
      className={cn(
        "group rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5",
        selected
          ? "border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/40"
          : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70"
      )}
    >
      <div className={cn(
        "inline-flex rounded-lg bg-slate-950/60 px-2 py-1 text-[10px] font-bold uppercase tracking-widest ring-1",
        STYLE[id]
      )}>
        {meta.subtitle}
      </div>
      <div className="mt-3 font-heading text-xl font-bold text-slate-100">
        {meta.label}
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {count} word{count === 1 ? "" : "s"}
      </div>
    </button>
  );
}

export default function DifficultyPicker({ value, onChange, recommendedDifficulty }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400/80">School levels</div>
            <p className="mt-1 text-xs text-slate-500">Start with familiar vocabulary and move up one school level at a time.</p>
          </div>
          <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 sm:inline-flex">
            Grade 4 → Year 7
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SCHOOL_LEVEL_IDS.map((id) => (
            <LevelCard key={id} id={id} selected={value === id} onSelect={onChange} />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/80">Spelling Bee levels</div>
          <p className="mt-1 text-xs text-slate-500">Harder vocabulary for secondary school and competition practice.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {BEE_LEVEL_IDS.map((id) => (
            <LevelCard key={id} id={id} selected={value === id} onSelect={onChange} />
          ))}
          <button
            type="button"
            data-testid="difficulty-adaptive-card"
            onClick={() => onChange("adaptive")}
            className={cn(
              "group rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5",
              value === "adaptive"
                ? "border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/40"
                : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70"
            )}
          >
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-950/60 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-fuchsia-300 ring-1 ring-fuchsia-500/40">
              <Wand2 className="h-3 w-3" /> Smart
            </div>
            <div className="mt-3 font-heading text-xl font-bold text-slate-100">Adaptive</div>
            <div className="mt-1 text-xs text-slate-500">
              Now → {DIFFICULTY_META[recommendedDifficulty]?.label || "Medium"}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
