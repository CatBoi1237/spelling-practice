import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layers, Target, ClipboardList, Infinity as InfinityIcon, Zap, Timer, Repeat, Shapes, Skull, Gauge, Gavel, ArrowRight, Wand2 } from "lucide-react";
import { DIFFICULTY_META, MODES, PATTERN_META, WORDS } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { getHistory, getMissed } from "@/lib/storage";
import { recommendDifficulty, weakPattern } from "@/lib/skill";
import { Eyebrow, SectionHeader, Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";

const ICONS = { classic: Layers, ten: Target, twentyfive: ClipboardList, endless: InfinityIcon, challenge: Zap, test: Timer, mistakes: Repeat, pattern: Shapes, survival: Skull, speed: Gauge, judge: Gavel };
const GROUPS = [
  { id: "core", title: "Practice modes", eyebrow: "Step 2" },
  { id: "learn", title: "Learning modes", eyebrow: "Targeted" },
  { id: "arena", title: "Arena modes", eyebrow: "Competitive" },
];
const DIFF_STYLE = {
  easy: "ring-emerald-500/40 text-emerald-300",
  medium: "ring-sky-500/40 text-sky-300",
  hard: "ring-amber-500/40 text-amber-300",
  extreme: "ring-rose-500/40 text-rose-300",
};

export default function PracticeHub() {
  const { settings, updateSettings } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState(params.get("difficulty") || settings.preferredDifficulty || "medium");
  const [testCount, setTestCount] = useState(settings.testWordCount || 20);
  const [testSeconds, setTestSeconds] = useState(settings.testModeSeconds || 20);
  const [testDef, setTestDef] = useState(!!settings.testShowDefinition);
  const [pattern, setPattern] = useState(null);

  const history = useMemo(() => getHistory(), []);
  const rec = useMemo(() => recommendDifficulty(history, settings.preferredDifficulty || "medium"), [history, settings.preferredDifficulty]);
  const missedCount = useMemo(() => getMissed().length, []);
  const weak = useMemo(() => weakPattern(), []);
  const patterns = useMemo(() => {
    const counts = {};
    WORDS.forEach((w) => (w.patterns || []).forEach((p) => (counts[p] = (counts[p] || 0) + 1)));
    return Object.entries(counts).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
  }, []);

  const start = (mode) => {
    if (difficulty !== "adaptive") updateSettings({ preferredDifficulty: difficulty });
    const q = new URLSearchParams({ mode: mode.id, difficulty });
    if (mode.id === "test") {
      updateSettings({ testWordCount: testCount, testModeSeconds: testSeconds, testShowDefinition: testDef });
      q.set("count", testCount);
      q.set("seconds", testSeconds);
      if (testDef) q.set("def", "1");
    }
    if (mode.id === "pattern") {
      const p = pattern || weak?.pattern || patterns[0]?.[0];
      if (!p) return;
      q.set("pattern", p);
    }
    navigate(`/practice?${q.toString()}`);
  };

  return (
    <div className="space-y-10">
      <header>
        <Eyebrow>Practice</Eyebrow>
        <h1 className="mt-2 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">Choose your round.</h1>
        <p className="mt-2 max-w-xl text-base text-slate-400">Pick a difficulty, then a mode. Every mode uses the same fast loop: hear it, spell it, learn it.</p>
      </header>

      <section>
        <SectionHeader eyebrow="Step 1" title="Difficulty" />
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {Object.entries(DIFFICULTY_META).map(([id, meta]) => (
            <button
              key={id}
              data-testid={`difficulty-${id}-card`}
              onClick={() => setDifficulty(id)}
              className={cn(
                "rounded-2xl border p-4 text-left transition-colors",
                difficulty === id ? "border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/40" : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              )}
            >
              <div className={cn("inline-flex rounded-lg bg-slate-950/60 px-2 py-1 text-[10px] font-bold uppercase tracking-widest ring-1", DIFF_STYLE[id])}>{meta.subtitle}</div>
              <div className="mt-3 font-heading text-xl font-bold text-slate-100">{meta.label}</div>
            </button>
          ))}
          <button
            data-testid="difficulty-adaptive-card"
            onClick={() => setDifficulty("adaptive")}
            className={cn(
              "rounded-2xl border p-4 text-left transition-colors",
              difficulty === "adaptive" ? "border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/40" : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
            )}
          >
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-950/60 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-300 ring-1 ring-indigo-500/40"><Wand2 className="h-3 w-3" /> Smart</div>
            <div className="mt-3 font-heading text-xl font-bold text-slate-100">Adaptive</div>
            <div className="mt-1 text-xs text-slate-500">Now → {DIFFICULTY_META[rec.difficulty]?.label}</div>
          </button>
        </div>
      </section>

      {GROUPS.map((g) => (
        <section key={g.id}>
          <SectionHeader eyebrow={g.eyebrow} title={g.title} />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.filter((m) => m.group === g.id).map((m) => {
              const Icon = ICONS[m.id] || Layers;
              const disabled = m.id === "mistakes" && missedCount === 0;
              return (
                <div key={m.id} className={cn("flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-colors hover:border-amber-500/40", disabled && "opacity-60")}>
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30"><Icon className="h-5 w-5" /></span>
                    <div className="flex-1">
                      <div className="font-heading text-lg font-semibold text-slate-100">{m.label}</div>
                      <p className="mt-1 text-sm leading-snug text-slate-400">{m.description}</p>
                      {m.id === "mistakes" && <p className="mt-1 text-xs text-rose-300">{missedCount ? `${missedCount} word${missedCount === 1 ? "" : "s"} to master` : "No missed words yet"}</p>}
                    </div>
                  </div>

                  {m.id === "test" && (
                    <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
                      <OptionRow label="Words" options={[10, 20, 50]} value={testCount} onChange={setTestCount} testId="test-count" />
                      <OptionRow label="Seconds" options={[10, 15, 20, 30]} value={testSeconds} onChange={setTestSeconds} testId="test-seconds" />
                      <label className="flex items-center justify-between text-slate-300">
                        <span>Show definition</span>
                        <input data-testid="test-show-definition" type="checkbox" checked={testDef} onChange={(e) => setTestDef(e.target.checked)} className="h-4 w-4 accent-amber-500" />
                      </label>
                    </div>
                  )}

                  {m.id === "pattern" && (
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      {weak && <p className="mb-2 text-xs text-amber-300">Recommended: {PATTERN_META[weak.pattern] || weak.pattern} ({weak.misses} misses)</p>}
                      <select
                        data-testid="pattern-select"
                        value={pattern || weak?.pattern || patterns[0]?.[0] || ""}
                        onChange={(e) => setPattern(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none"
                      >
                        {patterns.map(([p, n]) => (
                          <option key={p} value={p}>{PATTERN_META[p] || p} · {n} words</option>
                        ))}
                      </select>
                      {patterns.length === 0 && <p className="text-xs text-slate-500">Pattern data is loading with the expanded word library.</p>}
                    </div>
                  )}

                  <button
                    data-testid={`mode-${m.id}-card`}
                    onClick={() => start(m)}
                    disabled={disabled || (m.id === "pattern" && patterns.length === 0)}
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-amber-400 disabled:pointer-events-none disabled:opacity-40"
                  >
                    Start {m.label} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-xs text-slate-500">
        <Pill className="mr-2">Tip</Pill> {rec.reason}
      </p>
    </div>
  );
}

function OptionRow({ label, options, value, onChange, testId }) {
  return (
    <div className="flex items-center justify-between text-slate-300">
      <span>{label}</span>
      <div className="flex overflow-hidden rounded-full border border-slate-700 bg-slate-900">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            data-testid={`${testId}-${o}`}
            onClick={() => onChange(o)}
            className={cn("px-2.5 py-1 font-semibold", value === o ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-amber-300")}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
