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
  Brain,
  Bookmark,
  CalendarDays,
  Globe2,
  HeartHandshake,
  Tags,
} from "lucide-react";
import { CATEGORIES, DIFFICULTY_META, MODES, PATTERN_META, WORDS, TOPIC_PACKS } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { getHistory, getMissed, getWordStats } from "@/lib/storage";
import { getSavedWords } from "@/lib/savedWords";
import { recommendDifficulty, weakPattern } from "@/lib/skill";
import { Eyebrow, SectionHeader, Pill } from "@/components/ui-bits";
import DifficultyPicker from "@/components/DifficultyPicker";
import { cn } from "@/lib/utils";

import TopicPackCard from "@/components/TopicPackCard";
import { topicProgress } from "@/lib/topicProgress";

const ICONS = {
  classic: Layers,
  ten: Target,
  twentyfive: ClipboardList,
  endless: InfinityIcon,
  challenge: Zap,
  test: Timer,
  smart: Brain,
  mistakes: Repeat,
  saved: Bookmark,
  pattern: Shapes,
  category: Tags,
  origin: Globe2,
  confidence: HeartHandshake,
  survival: Skull,
  speed: Gauge,
  judge: Gavel,
  dailyMix: CalendarDays,
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
  const [packSearch, setPackSearch] = useState("");
  const [packFilter, setPackFilter] = useState("all");
  const packStats = useMemo(() => getWordStats(), []);
  const packRows = TOPIC_PACKS.map((pack) => ({ pack, progress: topicProgress(pack, packStats) }));
  const visiblePacks = packRows.filter(({ pack, progress }) => {
    const query = packSearch.trim().toLowerCase();
    const matches = !query || [pack.title, pack.description, ...pack.words.map(w => w.word)].some(text => text.toLowerCase().includes(query));
    return matches && (packFilter === "all" || (packFilter === "unfinished" ? progress.unmastered.length > 0 : progress.missed.length > 0));
  });
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [origin, setOrigin] = useState("Latin");

  const history = useMemo(() => getHistory(), []);
  const rec = useMemo(
    () => recommendDifficulty(history, settings.preferredDifficulty || "medium"),
    [history, settings.preferredDifficulty]
  );
  const missedCount = useMemo(() => getMissed().length, []);
  const savedCount = useMemo(() => getSavedWords().length, []);
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
  const origins = useMemo(() => {
    const counts = {};
    WORDS.forEach((w) => {
      if (w.origin) counts[w.origin] = (counts[w.origin] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, n]) => n >= 5)
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

    if (mode.id === "category") {
      q.set("category", category || CATEGORIES[0]);
    }

    if (mode.id === "origin") {
      q.set("origin", origin || origins[0]?.[0] || "Latin");
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
            SpellBee now runs from Basic through Elite, with year-range recommendations on each level. Pick the difficulty that feels right, then choose a mode.
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
              const disabled =
                (mode.id === "mistakes" && missedCount === 0) ||
                (mode.id === "saved" && savedCount === 0);

              return (
                <div
                  key={mode.id}
                  className={cn(
                    "flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-slate-900/60",
                    disabled && "opacity-60",
                    mode.id === "smart" && "border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-slate-900/50"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30",
                      mode.id === "smart" && "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30"
                    )}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-heading text-lg font-semibold text-slate-100">
                          {mode.label}
                        </div>
                        {mode.id === "smart" && (
                          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-200">Personalised</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-snug text-slate-400">
                        {mode.description}
                      </p>
                      {mode.id === "smart" && (
                        <p className="mt-2 text-xs leading-relaxed text-indigo-200/80">
                          Prioritises your mistakes first, then weak patterns, level-appropriate words and a few harder challenges.
                        </p>
                      )}
                      {mode.id === "mistakes" && (
                        <p className="mt-1 text-xs text-rose-300">
                          {missedCount
                            ? `${missedCount} word${missedCount === 1 ? "" : "s"} to master`
                            : "No missed words yet"}
                        </p>
                      )}
                      {mode.id === "saved" && (
                        <p className="mt-1 text-xs text-amber-300">
                          {savedCount
                            ? `${savedCount} saved word${savedCount === 1 ? "" : "s"}`
                            : "Save words from the library first"}
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

                  {mode.id === "category" && (
                    <SelectBox
                      testId="category-select"
                      value={category}
                      onChange={setCategory}
                      options={CATEGORIES.map((name) => [
                        name,
                        `${name} · ${WORDS.filter((word) => word.category === name).length} words`,
                      ])}
                    />
                  )}

                  {mode.id === "origin" && (
                    <SelectBox
                      testId="origin-select"
                      value={origin}
                      onChange={setOrigin}
                      options={origins.map(([name, count]) => [name, `${name} · ${count} words`])}
                    />
                  )}

                  <button
                    data-testid={`mode-${mode.id}-card`}
                    onClick={() => start(mode)}
                    disabled={disabled || (mode.id === "pattern" && patterns.length === 0)}
                    className={cn(
                      "mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[transform,background-color] hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40",
                      mode.id === "smart"
                        ? "bg-indigo-500 text-white hover:bg-indigo-400"
                        : "bg-amber-500 text-slate-950 hover:bg-amber-400"
                    )}
                  >
                    Start {mode.label} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section aria-label="Topic packs">
        <SectionHeader eyebrow="Explore a theme" title="Topic packs" />
        <p className="mt-2 text-sm text-slate-400">Each pack mixes levels, from familiar words to a few stretching challenges. Packs use their own word selection.</p>
        <p className="mt-2 text-xs text-slate-500">Master a word with three correct answers in a row. Your existing practice counts towards pack progress.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input aria-label="Search topic packs" placeholder="Find a topic or word…" value={packSearch} onChange={e => setPackSearch(e.target.value)} className="min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100" />
          <select aria-label="Filter topic packs by progress" value={packFilter} onChange={e => setPackFilter(e.target.value)} className="min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100">
            <option value="all">All packs</option>
            <option value="unfinished">Not yet mastered</option>
            <option value="missed">Have words to review</option>
          </select>
        </div>
        <p aria-live="polite" className="mt-3 text-xs text-slate-400">{visiblePacks.length} packs found</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePacks.map(({ pack, progress }) => <TopicPackCard key={pack.id} pack={pack} progress={progress} />)}
        </div>
        {!visiblePacks.length && <p className="mt-4 text-sm text-slate-400">No packs match. Try another search or choose All packs.</p>}
      </section>

      <p className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 text-xs text-slate-500">
        <Pill className="mr-2">Adaptive tip</Pill> {rec.reason}
      </p>
    </div>
  );
}

function SelectBox({ testId, value, onChange, options }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <select
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none"
      >
        {options.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
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
