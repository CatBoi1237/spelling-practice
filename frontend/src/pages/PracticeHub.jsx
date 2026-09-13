import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Layers,
  Target,
  ClipboardList,
  Infinity as InfinityIcon,
  Zap,
  Timer,
  Repeat,
  Shapes,
  Skull,
  Gauge,
  Gavel,
  ArrowRight,
} from "lucide-react";
import { DIFFICULTY_META, MODES, PATTERN_META, WORDS } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { getHistory, getMissed } from "@/lib/storage";
import { recommendDifficulty, weakPattern } from "@/lib/skill";
import { Eyebrow, SectionHeader, Pill } from "@/components/ui-bits";
import DifficultyPicker from "@/components/DifficultyPicker";
import { cn } from "@/lib/utils";

const ICONS = {
  classic: Layers,
  ten: Target,
  twentyfive: ClipboardList,
  endless: InfinityIcon,
  challenge: Zap,
  test: Timer,
  mistakes: Repeat,
  pattern: Shapes,
  survival: Skull,
  speed: Gauge,
  judge: Gavel,
};

const GROUPS = [
  { id: "core", title: "Practice modes", eyebrow: "Step 2" },
  { id: "learn", title: "Learning modes", eyebrow: "Targeted" },
  { id: "arena", title: "Arena modes", eyebrow: "Competitive" },
];

export default function PracticeHub() {
  const { settings, updateSettings } = useApp();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialDifficulty =
    params.get("difficulty") || settings.preferredDifficulty || "medium";
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [testCount, setTestCount] = useState(settings.testWordCount || 20);
  const [testSeconds, setTestSeconds] = useState(settings.testModeSeconds || 20);
  const [testDef, setTestDef] = useState(!!settings.testShowDefinition);
  const [pattern, setPattern] = useState(null);

  const history = useMemo(() => getHistory(), []);
  const rec = useMemo(
    () => recommendDifficulty(history, settings.preferredDifficulty || "medium"),
    [history, settings.preferredDifficulty]
  );
  const missedCount = useMemo(() => getMissed().length, []);
  const weak = useMemo(() => weakPattern(), []);
  const patterns = useMemo(() => {
    const counts = {};
    WORDS.forEach((w) =>
      (w.patterns || []).forEach((p) => (counts[p] = (counts[p] || 0) + 1))
    );
    return Object.entries(counts)
      .filter(([, n]) => n >= 3)
      .sort((a, b) => b[1] - a[1]);
  }, []);

  const start = (mode) => {
    if (difficulty !== "adaptive") {
      updateSettings({ preferredDifficulty: difficulty });
    }

    const q = new URLSearchParams({ mode: mode.id, difficulty });

    if (mode.id === "test") {
      updateSettings({
        testWordCount: testCount,
        testModeSeconds: testSeconds,
        testShowDefinition: testDef,
      });
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

  const selectedLabel =
    difficulty === "adaptive"
      ? `Adaptive → ${DIFFICULTY_META[rec.difficulty]?.label || "Medium"}`
      : DIFFICULTY_META[difficulty]?.label || difficulty;

  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-950 to-amber-950/20 p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative">
          <Eyebrow>Practice</Eyebrow>
          <h1 className="mt-2 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">
            Choose your level. Then spell.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-slate-400">
            SpellBee now starts as early as Grade 4 and scales all the way to national-bee vocabulary. Pick the level that feels right, then choose a mode.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
            Selected: {selectedLabel}
          </div>
        </div>
      </header>

      <section>
        <SectionHeader eyebrow="Step 1" title="Choose your level" />
        <div className="mt-4">
          <DifficultyPicker
            value={difficulty}
            onChange={setDifficulty}
            recommendedDifficulty={rec.difficulty}
          />
        </div>
      </section>

      {GROUPS.map((group) => (
        <section key={group.id}>
          <SectionHeader eyebrow={group.eyebrow} title={group.title} />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.filter((mode) => mode.group === group.id).map((mode) => {
              const Icon = ICONS[mode.id] || Layers;
              const disabled = mode.id === "mistakes" && missedCount === 0;

              return (
                <div
                  key={mode.id}
                  className={cn(
                    "flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-slate-900/60",
                    disabled && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <div className="font-heading text-lg font-semibold text-slate-100">
                        {mode.label}
                      </div>
                      <p className="mt-1 text-sm leading-snug text-slate-400">
                        {mode.description}
                      </p>
                      {mode.id === "mistakes" && (
                        <p className="mt-1 text-xs text-rose-300">
                          {missedCount
                            ? `${missedCount} word${missedCount === 1 ? "" : "s"} to master`
                            : "No missed words yet"}
                        </p>
                      )}
                    </div>
                  </div>

                  {mode.id === "test" && (
                    <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
                      <OptionRow
                        label="Words"
                        options={[10, 20, 50]}
                        value={testCount}
                        onChange={setTestCount}
                        testId="test-count"
                      />
                      <OptionRow
                        label="Seconds"
                        options={[10, 15, 20, 30]}
                        value={testSeconds}
                        onChange={setTestSeconds}
                        testId="test-seconds"
                      />
                      <label className="flex items-center justify-between text-slate-300">
                        <span>Show definition</span>
                        <input
                          data-testid="test-show-definition"
                          type="checkbox"
                          checked={testDef}
                          onChange={(e) => setTestDef(e.target.checked)}
                          className="h-4 w-4 accent-amber-500"
                        />
                      </label>
                    </div>
                  )}

                  {mode.id === "pattern" && (
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      {weak && (
                        <p className="mb-2 text-xs text-amber-300">
                          Recommended: {PATTERN_META[weak.pattern] || weak.pattern} ({weak.misses} misses)
                        </p>
                      )}
                      <select
                        data-testid="pattern-select"
                        value={pattern || weak?.pattern || patterns[0]?.[0] || ""}
                        onChange={(e) => setPattern(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none"
                      >
                        {patterns.map(([p, n]) => (
                          <option key={p} value={p}>
                            {PATTERN_META[p] || p} · {n} words
                          </option>
                        ))}
                      </select>
                      {patterns.length === 0 && (
                        <p className="text-xs text-slate-500">
                          Pattern data is loading with the expanded word library.
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    data-testid={`mode-${mode.id}-card`}
                    onClick={() => start(mode)}
                    disabled={disabled || (mode.id === "pattern" && patterns.length === 0)}
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-amber-400 disabled:pointer-events-none disabled:opacity-40"
                  >
                    Start {mode.label} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <p className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 text-xs text-slate-500">
        <Pill className="mr-2">Adaptive tip</Pill> {rec.reason}
      </p>
    </div>
  );
}

function OptionRow({ label, options, value, onChange, testId }) {
  return (
    <div className="flex items-center justify-between text-slate-300">
      <span>{label}</span>
      <div className="flex overflow-hidden rounded-full border border-slate-700 bg-slate-900">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            data-testid={`${testId}-${option}`}
            onClick={() => onChange(option)}
            className={cn(
              "px-2.5 py-1 font-semibold",
              value === option
                ? "bg-amber-500 text-slate-950"
                : "text-slate-300 hover:text-amber-300"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
