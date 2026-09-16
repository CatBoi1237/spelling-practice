import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Flame,
  Gauge,
  ListChecks,
  Medal,
  Repeat,
  School,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { DIFFICULTY_META, FOUNDATION_LEVEL_IDS, PATTERN_META } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { getMissed, getHistory, countMastered, getDailyLocal } from "@/lib/storage";
import { getSavedWords } from "@/lib/savedWords";
import { computeSkill, recommendDifficulty, levelTitle, weakPattern } from "@/lib/skill";
import { achievementProgress } from "@/lib/achievements";
import { BeeMascot } from "@/components/BeeMascot";
import { StatCard, SectionHeader, PrimaryButton, GhostButton, Eyebrow } from "@/components/ui-bits";
import { cn } from "@/lib/utils";

const SCHOOL_STYLE = {
  grade4: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/60",
  grade5: "border-teal-500/30 bg-teal-500/5 hover:border-teal-400/60",
  grade6: "border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-400/60",
  year7: "border-sky-500/30 bg-sky-500/5 hover:border-sky-400/60",
};

const DIFF_COLOR = {
  grade4: "text-emerald-300",
  grade5: "text-teal-300",
  grade6: "text-cyan-300",
  year7: "text-sky-300",
  easy: "text-indigo-300",
  medium: "text-violet-300",
  hard: "text-amber-300",
  extreme: "text-rose-300",
};

export default function Dashboard() {
  const { stats, settings } = useApp();
  const { user, playerName } = useAuth();
  const navigate = useNavigate();

  const history = useMemo(() => getHistory(), []);
  const missed = useMemo(() => getMissed().slice(0, 5), []);
  const savedCount = useMemo(() => getSavedWords().length, []);
  const mastered = useMemo(() => countMastered(), []);
  const daily = useMemo(() => getDailyLocal(), []);
  const level = useMemo(() => computeSkill(history, stats), [history, stats]);
  const rec = useMemo(
    () => recommendDifficulty(history, settings.preferredDifficulty || "medium"),
    [history, settings.preferredDifficulty]
  );
  const weak = useMemo(() => weakPattern(), []);
  const achievements = useMemo(() => achievementProgress(stats), [stats]);
  const unlockedCount = achievements.filter((achievement) => achievement.unlockedAt).length;

  const accuracy = stats.totalAttempted
    ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100)
    : null;
  const firstTime = stats.totalAttempted === 0;
  const todayDone = daily.completed?.includes(new Date().toISOString().slice(0, 10));

  const go = (mode, extra = {}) => {
    const q = new URLSearchParams({ mode, difficulty: rec.difficulty, ...extra });
    navigate(`/practice?${q}`);
  };

  return (
    <div className="space-y-10">
      <section className="grid gap-4 lg:grid-cols-12">
        <div data-testid="hero-card" className="honeycomb-hero relative col-span-12 overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-8 lg:col-span-8 lg:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Eyebrow>{firstTime ? "Welcome" : `Welcome back, ${user?.name || playerName}`}</Eyebrow>
              <h1 className="mt-4 font-heading text-4xl font-black leading-[1.02] tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
                Listen.<br />Spell.<br /><span className="text-amber-400">Master.</span>
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-slate-400">
                {firstTime
                  ? "Start with a difficulty that feels comfortable, hear each word clearly, and learn from every miss."
                  : "Your next round is tuned to your level, or you can jump into any difficulty below."}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <PrimaryButton data-testid="start-practice-button" onClick={() => go("classic")}>
                  Start Practice <ArrowRight className="h-4 w-4" />
                </PrimaryButton>
                <GhostButton data-testid="hero-daily-button" onClick={() => navigate("/daily")}>
                  <CalendarDays className="h-4 w-4" /> {todayDone ? "Daily done ✓" : "Daily Challenge"}
                </GhostButton>
              </div>
            </div>
            <BeeMascot size={150} mood={accuracy != null && accuracy >= 80 ? "happy" : "idle"} className="mx-auto shrink-0 drop-shadow-2xl sm:mx-0" />
          </div>
        </div>

        <div data-testid="quick-stats-card" className="stagger col-span-12 grid grid-cols-2 gap-3 lg:col-span-4">
          <StatCard testId="stat-daily-streak" icon={Flame} label="Daily streak" value={`${daily.streak || 0}`} sub={daily.streak ? "days in a row" : "play today to start"} accent="text-orange-300" />
          <StatCard testId="stat-accuracy" icon={Target} label="Accuracy" value={accuracy == null ? "—" : `${accuracy}%`} sub={accuracy == null ? "no words yet" : `${stats.totalAttempted} attempted`} accent="text-sky-300" />
          <StatCard testId="stat-mastered" icon={BookOpenCheck} label="Words mastered" value={mastered} sub="3 correct in a row" accent="text-emerald-300" />
          <StatCard testId="stat-level" icon={Gauge} label="Spelling level" value={level == null ? "—" : `${level.toFixed(1)}`} sub={level == null ? "10 words to unlock" : `${levelTitle(level)} · /10`} accent="text-amber-300" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div data-testid="recommended-card" className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <Eyebrow>Continue practising</Eyebrow>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-500">Recommended</div>
              <div data-testid="recommended-difficulty" className={cn("font-heading text-3xl font-black", DIFF_COLOR[rec.difficulty])}>
                {DIFFICULTY_META[rec.difficulty]?.label || rec.difficulty}
              </div>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs text-slate-400">{settings.defaultLength || 10} words</span>
          </div>
          <p className="mt-3 text-sm text-slate-400">{rec.reason}</p>
          <PrimaryButton data-testid="continue-button" className="mt-5 w-full sm:w-auto" onClick={() => go("classic")}>
            Continue <ArrowRight className="h-4 w-4" />
          </PrimaryButton>
        </div>

        <div data-testid="daily-challenge-card" className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-slate-950 p-6">
          <Eyebrow>Today's challenge</Eyebrow>
          <h3 className="mt-3 font-heading text-2xl font-bold text-slate-100">📅 Daily Challenge</h3>
          <p className="mt-2 text-sm text-slate-400">5 words · 1 attempt each · same words for everyone today. Share your emoji grid.</p>
          <PrimaryButton data-testid="go-daily-button" className="mt-5 w-full sm:w-auto" onClick={() => navigate("/daily")}>
            {todayDone ? "View today's result" : "Start Daily Challenge"} <ArrowRight className="h-4 w-4" />
          </PrimaryButton>
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Start at your level"
          title="Foundation difficulty modes"
          action={<Link to="/practice" className="text-sm font-semibold text-amber-400 hover:text-amber-300">All levels →</Link>}
        />
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {FOUNDATION_LEVEL_IDS.map((id) => {
            const meta = DIFFICULTY_META[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigate(`/practice?difficulty=${id}`)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5",
                  SCHOOL_STYLE[id]
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-slate-950/50">
                    <School className="h-5 w-5 text-slate-200" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-slate-200" />
                </div>
                <div className="mt-4 font-heading text-2xl font-black text-slate-50">{meta.label}</div>
                <div className="mt-1 text-xs text-slate-500">{meta.recommendation}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Quick practice" title="Jump straight in" action={<Link to="/practice" data-testid="all-modes-link" className="text-sm font-semibold text-amber-400 hover:text-amber-300">All modes →</Link>} />
        <div className="stagger mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickCard testId="quick-ten" label="10 Words" sub="Quick round" onClick={() => go("ten")} />
          <QuickCard testId="quick-twentyfive" label="25 Words" sub="Deep session" onClick={() => go("twentyfive")} />
          <QuickCard testId="quick-saved" label="Saved Words" sub={savedCount ? `${savedCount} bookmarked` : "Build your bank"} onClick={() => savedCount ? go("saved", { difficulty: "mixed" }) : navigate("/library")} />
          <QuickCard testId="quick-category" label="Science Drill" sub="Topic practice" onClick={() => go("category", { category: "Science" })} />
          <QuickCard testId="quick-confidence" label="Confidence" sub="Steadier round" onClick={() => go("confidence")} />
          <QuickCard testId="quick-daily-mix" label="Daily Mix" sub="12 fresh words" onClick={() => go("dailyMix", { difficulty: "mixed" })} />
          <QuickCard testId="quick-endless" label="Endless" sub="Until you stop" onClick={() => go("endless")} />
          <QuickCard testId="quick-challenge" label="Challenge" sub="15s per word" onClick={() => go("challenge")} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div data-testid="words-to-master-card" className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 lg:col-span-2">
          <SectionHeader eyebrow="Words to master" title="Your toughest words" action={missed.length > 0 && (
            <button data-testid="practice-missed-button" onClick={() => go("mistakes")} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20">
              <Repeat className="h-4 w-4" /> Practice Mistakes
            </button>
          )} />
          {missed.length === 0 ? (
            <div className="mt-4 flex items-center gap-4 rounded-2xl border border-dashed border-slate-800 p-5">
              <BeeMascot size={56} mood="happy" />
              <p className="text-sm text-slate-400">
                {firstTime
                  ? "Nothing to master yet — your misses will show up here so you can drill them."
                  : "No words outstanding. Every miss has been mastered. Go break some new ground."}
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-800">
              {missed.map((item) => (
                <li key={item.word} data-testid={`missed-row-${item.word}`} className="flex items-center justify-between gap-3 py-3">
                  <button onClick={() => navigate(`/practice?mode=ten&word=${encodeURIComponent(item.word)}`)} className="font-mono text-base tracking-wider text-slate-100 hover:text-amber-300">{item.word}</button>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full bg-rose-400" style={{ width: `${100 - item.accuracy}%` }} />
                    </div>
                    <span className="w-12 text-right font-mono text-xs text-slate-400">{item.correct}/{item.attempts}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {weak && (
            <div data-testid="weak-pattern-card" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Spelling pattern to practise</div>
                <div className="mt-1 font-heading text-lg font-bold text-slate-100">{PATTERN_META[weak.pattern] || weak.pattern}</div>
                <div className="text-xs text-slate-400">{weak.misses} misses · {weak.available} words available</div>
              </div>
              <GhostButton data-testid="practice-pattern-button" onClick={() => go("pattern", { pattern: weak.pattern })}>Focused session</GhostButton>
            </div>
          )}
        </div>

        <div data-testid="achievements-card" className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <SectionHeader eyebrow="Achievements" title={`${unlockedCount}/${achievements.length}`} action={<Link to="/achievements" data-testid="all-achievements-link" className="text-sm font-semibold text-amber-400 hover:text-amber-300">All →</Link>} />
          <div className="mt-4 grid grid-cols-4 gap-2">
            {achievements.slice(0, 8).map((achievement) => (
              <div key={achievement.id} title={`${achievement.title} — ${achievement.desc}`} className={cn("grid aspect-square place-items-center rounded-xl border text-2xl", achievement.unlockedAt ? "border-amber-500/40 bg-amber-500/10" : "border-slate-800 bg-slate-950/40 grayscale opacity-40")}>
                {achievement.emoji}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Medal className="h-3.5 w-3.5" /> Best streak {stats.bestStreak} · {stats.totalPoints || 0} points
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MiniLink testId="go-multiplayer-button" icon={Users} title="Multiplayer & Classroom" body="Race friends or host a teacher-led spelling game." to="/multiplayer" />
        <MiniLink testId="go-word-lists-button" icon={ListChecks} title="My Word Lists" body="Build your own 5, 10, 15 or 25-word spelling lists." to="/word-lists" />
        <MiniLink testId="go-progress-button" icon={Trophy} title="Progress & charts" body="Accuracy, difficulty progression and session history." to="/progress" />
      </section>
    </div>
  );
}

function QuickCard({ testId, label, sub, onClick }) {
  return (
    <button data-testid={testId} onClick={onClick} className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-left transition-[transform,border-color] hover:-translate-y-0.5 hover:border-amber-500/40">
      <div className="font-heading text-xl font-bold text-slate-100">{label}</div>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        {sub} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 group-hover:text-amber-400" />
      </div>
    </button>
  );
}

function MiniLink({ testId, icon: Icon, title, body, to }) {
  return (
    <Link to={to} data-testid={testId} className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-all hover:-translate-y-0.5 hover:border-amber-500/40">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/30">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="font-heading text-lg font-semibold text-slate-100">{title}</div>
        <p className="mt-1 text-sm text-slate-400">{body}</p>
      </div>
    </Link>
  );
}
