import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Target, Trophy, Zap, ArrowRight, GraduationCap, Award, Timer, Infinity as InfinityIcon, Layers, ClipboardList, BookOpen } from "lucide-react";
import { DIFFICULTY_META, MODES } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { getMissed } from "@/lib/storage";
import { cn } from "@/lib/utils";

const modeIcons = {
  classic: Layers,
  ten: Target,
  twentyfive: ClipboardList,
  endless: InfinityIcon,
  challenge: Zap,
  test: Timer,
};

const difficultyStyle = {
  easy: "from-emerald-500/20 to-emerald-500/5 ring-emerald-500/40 text-emerald-300",
  medium: "from-sky-500/20 to-sky-500/5 ring-sky-500/40 text-sky-300",
  hard: "from-amber-500/25 to-amber-500/5 ring-amber-500/40 text-amber-300",
  extreme: "from-rose-500/25 to-rose-500/5 ring-rose-500/40 text-rose-300",
};

export default function Dashboard() {
  const { stats, settings, updateSettings } = useApp();
  const [difficulty, setDifficulty] = useState(settings.preferredDifficulty || "medium");
  const navigate = useNavigate();

  const accuracy = stats.totalAttempted
    ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100)
    : 0;

  const missed = useMemo(() => getMissed().slice(0, 6), []);

  const start = (mode) => {
    updateSettings({ preferredDifficulty: difficulty });
    navigate(`/practice?mode=${mode}&difficulty=${difficulty}`);
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="grid gap-6 md:grid-cols-12">
        <div
          data-testid="hero-card"
          className="relative col-span-12 overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-8 md:col-span-8 md:p-12"
        >
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-500/5 blur-3xl" />
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300">
            <GraduationCap className="h-3 w-3" />
            Year 7–12 · Bee Trainer
          </span>
          <h1 className="mt-6 font-heading text-4xl font-black leading-[1.05] tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            Master every word.
            <br />
            <span className="text-amber-400">One spelling at a time.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
            Listen. Type. Learn. Train your ear and your keyboard against hundreds of carefully picked words — from everyday vocabulary to national-bee stumpers.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              data-testid="start-practice-button"
              onClick={() => start("classic")}
              className="group inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-400"
            >
              Start Practice
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </button>
            <button
              data-testid="start-test-mode-button"
              onClick={() => start("test")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-300"
            >
              <Timer className="h-4 w-4" /> Test Mode
            </button>
          </div>
        </div>

        {/* Quick stat card */}
        <div
          data-testid="quick-stats-card"
          className="col-span-12 grid grid-cols-2 gap-3 rounded-3xl border border-slate-800 bg-slate-900/40 p-5 md:col-span-4"
        >
          <StatBox testId="stat-streak" icon={Flame} label="Current Streak" value={stats.currentStreak} suffix={stats.currentStreak > 3 ? "🔥" : ""} accent="text-orange-300" />
          <StatBox testId="stat-best" icon={Trophy} label="Best Streak" value={stats.bestStreak} accent="text-amber-300" />
          <StatBox testId="stat-completed" icon={Award} label="Words Done" value={stats.wordsCompleted} accent="text-emerald-300" />
          <StatBox testId="stat-accuracy" icon={Target} label="Accuracy" value={`${accuracy}%`} accent="text-sky-300" />
        </div>
      </section>

      {/* Difficulty */}
      <section>
        <SectionHeader eyebrow="Step 1" title="Pick a difficulty" />
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(DIFFICULTY_META).map(([id, meta]) => {
            const active = difficulty === id;
            return (
              <button
                key={id}
                data-testid={`difficulty-${id}-card`}
                onClick={() => setDifficulty(id)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-5 text-left transition",
                  active
                    ? "border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/40"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900"
                )}
              >
                <div className={cn("mb-4 inline-flex rounded-lg bg-gradient-to-br p-2 ring-1", difficultyStyle[id])}>
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="font-heading text-xl font-bold text-slate-100">{meta.label}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-slate-500">{meta.subtitle}</div>
                {active && (
                  <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950">Selected</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Modes */}
      <section>
        <SectionHeader eyebrow="Step 2" title="Choose a mode" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m) => {
            const Icon = modeIcons[m.id] || Layers;
            return (
              <button
                key={m.id}
                data-testid={`mode-${m.id}-card`}
                onClick={() => start(m.id)}
                className="group flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-left transition hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-slate-900"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30 transition group-hover:bg-amber-500/20">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-lg font-semibold text-slate-100">{m.label}</span>
                    <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-amber-400" />
                  </div>
                  <p className="mt-1 text-sm leading-snug text-slate-400">{m.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent missed */}
      {missed.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <SectionHeader eyebrow="Weakest words" title="Practise your misses" />
            <button
              data-testid="practice-missed-button"
              onClick={() => navigate("/practice?mode=classic&list=missed")}
              className="text-sm font-semibold text-amber-400 hover:text-amber-300"
            >
              Drill all →
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {missed.map((m) => (
              <span
                key={m.word}
                data-testid={`missed-chip-${m.word}`}
                className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-200"
              >
                {m.word} · x{m.count}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatBox({ testId, icon: Icon, label, value, accent, suffix = "" }) {
  return (
    <div
      data-testid={testId}
      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
        <Icon className={cn("h-4 w-4", accent)} />
      </div>
      <div className="mt-3 font-heading text-3xl font-black text-slate-50">
        {value}
        {suffix && <span className="ml-1 text-base">{suffix}</span>}
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/80">{eyebrow}</span>
      <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">{title}</h2>
    </div>
  );
}
