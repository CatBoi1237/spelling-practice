import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Target, Flame, Award, Gauge, Clock, BookOpenCheck } from "lucide-react";

import { useApp } from "@/context/AppContext";
import { DIFFICULTY_META } from "@/data/words";
import { getHistory, getMissed, countMastered } from "@/lib/storage";
import { computeSkill, DIFF_ORDER, levelTitle, rankDiff } from "@/lib/skill";

const AXIS_LABELS = {
  1: "G4",
  2: "G5",
  3: "G6",
  4: "Y7",
  5: "Easy",
  6: "Med",
  7: "Hard",
  8: "Extr",
};

const BAR_LEVELS = [...DIFF_ORDER, "mixed"];

function difficultyLabel(id) {
  if (id === "mixed") return "Mixed";
  return DIFFICULTY_META[id]?.label || id;
}

export default function Progress() {
  const { stats } = useApp();
  const navigate = useNavigate();
  const history = useMemo(() => getHistory(), []);
  const missed = useMemo(() => getMissed(), []);
  const mastered = useMemo(() => countMastered(), []);
  const level = useMemo(() => computeSkill(history, stats), [history, stats]);

  const accuracy = stats.totalAttempted
    ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100)
    : 0;
  const avgTime = stats.totalAttempted && stats.totalTimeMs
    ? (stats.totalTimeMs / stats.totalAttempted / 1000).toFixed(1)
    : null;

  const diffProgression = useMemo(
    () => history
      .slice()
      .reverse()
      .map((session, index) => ({
        name: `#${index + 1}`,
        level: rankDiff(session.difficulty) || 5,
        difficulty: difficultyLabel(session.difficulty),
      })),
    [history]
  );

  const lineData = useMemo(
    () => history
      .slice()
      .reverse()
      .map((session, index) => ({
        name: `#${index + 1}`,
        accuracy: session.correct + session.incorrect
          ? Math.round((session.correct / (session.correct + session.incorrect)) * 100)
          : 0,
      })),
    [history]
  );

  const barData = useMemo(() => {
    const byDifficulty = {};
    history.forEach((session) => {
      byDifficulty[session.difficulty] =
        (byDifficulty[session.difficulty] || 0) + session.correct;
    });

    return BAR_LEVELS
      .map((id) => ({
        id,
        name: id === "grade4" ? "G4" :
          id === "grade5" ? "G5" :
          id === "grade6" ? "G6" :
          id === "year7" ? "Y7" :
          id === "medium" ? "Med" :
          id === "extreme" ? "Extr" : id,
        difficulty: difficultyLabel(id),
        correct: byDifficulty[id] || 0,
      }))
      .filter((item) => item.correct > 0 || history.some((session) => session.difficulty === item.id));
  }, [history]);

  const recentLevel = history[0]?.difficulty;

  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-950 to-indigo-950/30 p-6 sm:p-8">
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/80">Progress</span>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">Your spelling journey</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Track your climb from school-level vocabulary through competition spelling, plus the words that still need work.
            </p>
          </div>
          {recentLevel && (
            <span className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-200">
              Latest level · {difficultyLabel(recentLevel)}
            </span>
          )}
        </div>
      </header>

      <section className="stagger grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <SummaryCard testId="progress-accuracy" icon={Target} label="Accuracy" value={stats.totalAttempted ? `${accuracy}%` : "—"} />
        <SummaryCard testId="progress-total" icon={Award} label="Words attempted" value={stats.totalAttempted.toLocaleString()} />
        <SummaryCard testId="progress-mastered" icon={BookOpenCheck} label="Words mastered" value={mastered} />
        <SummaryCard testId="progress-streak" icon={Flame} label="Best streak" value={stats.bestStreak} />
        <SummaryCard testId="progress-avg-time" icon={Clock} label="Avg response" value={avgTime ? `${avgTime}s` : "—"} />
        <SummaryCard testId="progress-level" icon={Gauge} label="Skill rating" value={level == null ? "—" : `${level.toFixed(1)}/10`} sub={level == null ? "10 words to unlock" : levelTitle(level)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="Accuracy over sessions" subtitle="Aim for a steady climb, not one perfect round." testId="chart-accuracy">
          {lineData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12 }} formatter={(value) => [`${value}%`, "Accuracy"]} />
                <Line type="monotone" dataKey="accuracy" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title="Level progression" subtitle="Grade 4 through national-bee vocabulary." testId="chart-progression">
          {diffProgression.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={diffProgression}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis
                  stroke="#64748b"
                  domain={[1, 8]}
                  ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
                  width={42}
                  tickFormatter={(value) => AXIS_LABELS[value] || ""}
                />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12 }}
                  formatter={(value, name, item) => [item?.payload?.difficulty || AXIS_LABELS[Math.round(value)] || value, "Level"]}
                />
                <Line type="stepAfter" dataKey="level" stroke="#818cf8" strokeWidth={2.5} dot={{ fill: "#818cf8" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title="Correct answers by level" subtitle="See where most of your successful spelling happens." testId="chart-difficulty">
          {barData.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#64748b" interval={0} fontSize={11} />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12 }} formatter={(value, name, item) => [value, item?.payload?.difficulty || "Correct"]} />
                <Bar dataKey="correct" radius={[6, 6, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-slate-100">Words to master</h2>
            <p className="mt-1 text-sm text-slate-400">Sorted by how much work they need. Three correct in a row = mastered.</p>
          </div>
          {missed.length > 0 && (
            <button data-testid="progress-practice-mistakes" onClick={() => navigate("/practice?mode=mistakes")} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400">Practice mistakes</button>
          )}
        </div>

        <div className="mt-4">
          {missed.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {missed.slice(0, 20).map((item) => (
                <div key={item.word} data-testid={`progress-missed-${item.word}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3 transition-colors hover:border-slate-700">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-lg tracking-widest text-slate-100">{item.word}</div>
                    <div className="text-xs text-slate-400">{item.correct}/{item.attempts} correct · streak {item.streak} · last {new Date(item.lastAttempted).toLocaleDateString()}</div>
                  </div>
                  <span className="shrink-0 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200">{item.accuracy}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">No misses tracked yet — start a session to build your custom drill list.</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-2xl font-bold text-slate-100">Recent sessions</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-slate-900/60 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Correct</th>
                <th className="px-4 py-3">Incorrect</th>
                <th className="px-4 py-3">Best streak</th>
                <th className="px-4 py-3">Points</th>
              </tr>
            </thead>
            <tbody data-testid="history-table" className="divide-y divide-slate-800">
              {history.length ? history.slice(0, 10).map((session, index) => (
                <tr key={index} className="text-slate-300 hover:bg-slate-900/35">
                  <td className="px-4 py-3">{new Date(session.date).toLocaleString()}</td>
                  <td className="px-4 py-3 capitalize">{session.mode}</td>
                  <td className="px-4 py-3">{difficultyLabel(session.difficulty)}</td>
                  <td className="px-4 py-3 text-emerald-300">{session.correct}</td>
                  <td className="px-4 py-3 text-rose-300">{session.incorrect}</td>
                  <td className="px-4 py-3">{session.bestStreak}</td>
                  <td className="px-4 py-3 text-amber-300">{session.points ?? "—"}</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No sessions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ testId, icon: Icon, label, value, sub }) {
  return (
    <div data-testid={testId} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-all hover:-translate-y-0.5 hover:border-slate-700">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-amber-400" />
      </div>
      <div className="mt-3 font-heading text-3xl font-black text-slate-50">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children, testId }) {
  return (
    <div data-testid={testId} className="rounded-3xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500/80">{title}</div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyChart() {
  return <div className="grid h-[250px] place-items-center text-sm text-slate-500">Play a session to build charts.</div>;
}
