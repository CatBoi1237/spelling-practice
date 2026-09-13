import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { getHistory, getMissed, countMastered } from "@/lib/storage";
import { computeSkill, levelTitle, rankDiff } from "@/lib/skill";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { Trophy, Target, Flame, Award, Gauge, Clock, BookOpenCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Progress() {
  const { stats } = useApp();
  const navigate = useNavigate();
  const history = useMemo(() => getHistory(), []);
  const missed = useMemo(() => getMissed(), []);
  const mastered = useMemo(() => countMastered(), []);
  const level = useMemo(() => computeSkill(history, stats), [history, stats]);

  const accuracy = stats.totalAttempted ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;
  const avgTime = stats.totalAttempted && stats.totalTimeMs ? (stats.totalTimeMs / stats.totalAttempted / 1000).toFixed(1) : null;
  const diffProgression = useMemo(() => history.slice().reverse().map((h, i) => ({ name: `#${i + 1}`, level: rankDiff(h.difficulty) || 2.5 })), [history]);

  const lineData = useMemo(() => {
    return history
      .slice()
      .reverse()
      .map((h, i) => ({
        name: `#${i + 1}`,
        accuracy: h.correct + h.incorrect ? Math.round((h.correct / (h.correct + h.incorrect)) * 100) : 0,
      }));
  }, [history]);

  const barData = useMemo(() => {
    const byDiff = { easy: 0, medium: 0, hard: 0, extreme: 0, mixed: 0 };
    history.forEach((h) => {
      byDiff[h.difficulty] = (byDiff[h.difficulty] || 0) + h.correct;
    });
    return [
      { name: "Easy", correct: byDiff.easy },
      { name: "Medium", correct: byDiff.medium },
      { name: "Hard", correct: byDiff.hard },
      { name: "Extreme", correct: byDiff.extreme },
      { name: "Mixed", correct: byDiff.mixed },
    ];
  }, [history]);

  return (
    <div className="space-y-10">
      <header>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/80">Progress</span>
        <h1 className="mt-2 font-heading text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">Your spelling journey</h1>
      </header>

      <section className="stagger grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <SummaryCard testId="progress-accuracy" icon={Target} label="Accuracy" value={stats.totalAttempted ? `${accuracy}%` : "—"} />
        <SummaryCard testId="progress-total" icon={Award} label="Words attempted" value={stats.totalAttempted.toLocaleString()} />
        <SummaryCard testId="progress-mastered" icon={BookOpenCheck} label="Words mastered" value={mastered} />
        <SummaryCard testId="progress-streak" icon={Flame} label="Best streak" value={stats.bestStreak} />
        <SummaryCard testId="progress-avg-time" icon={Clock} label="Avg response" value={avgTime ? `${avgTime}s` : "—"} />
        <SummaryCard testId="progress-level" icon={Gauge} label="Spelling level" value={level == null ? "—" : `${level.toFixed(1)}/10`} sub={level == null ? "10 words to unlock" : levelTitle(level)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Accuracy over sessions" testId="chart-accuracy">
          {lineData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                <Line type="monotone" dataKey="accuracy" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Difficulty progression" testId="chart-progression">
          {diffProgression.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={diffProgression}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" domain={[0, 4]} ticks={[1, 2, 3, 4]} tickFormatter={(v) => ["", "Easy", "Med", "Hard", "Extr"][v] || ""} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} formatter={(v) => ["", "Easy", "Medium", "Hard", "Extreme"][Math.round(v)] || "Mixed"} />
                <Line type="stepAfter" dataKey="level" stroke="#818cf8" strokeWidth={2.5} dot={{ fill: "#818cf8" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Correct answers by difficulty" testId="chart-difficulty">
          {history.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                <Bar dataKey="correct" radius={[6, 6, 0, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
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
              {missed.slice(0, 20).map((m) => (
                <div key={m.word} data-testid={`progress-missed-${m.word}`} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                  <div>
                    <div className="font-mono text-lg tracking-widest text-slate-100">{m.word}</div>
                    <div className="text-xs text-slate-400">{m.correct}/{m.attempts} correct · streak {m.streak} · last {new Date(m.lastAttempted).toLocaleDateString()}</div>
                  </div>
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200">{m.accuracy}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
              No misses tracked yet — start a session to build your custom drill list.
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-2xl font-bold text-slate-100">Recent sessions</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Correct</th>
                <th className="px-4 py-3">Incorrect</th>
                <th className="px-4 py-3">Best streak</th>
                <th className="px-4 py-3">Points</th>
              </tr>
            </thead>
            <tbody data-testid="history-table" className="divide-y divide-slate-800">
              {history.length ? (
                history.slice(0, 10).map((h, i) => (
                  <tr key={i} className="text-slate-300">
                    <td className="px-4 py-3">{new Date(h.date).toLocaleString()}</td>
                    <td className="px-4 py-3 capitalize">{h.mode}</td>
                    <td className="px-4 py-3 capitalize">{h.difficulty}</td>
                    <td className="px-4 py-3 text-emerald-300">{h.correct}</td>
                    <td className="px-4 py-3 text-rose-300">{h.incorrect}</td>
                    <td className="px-4 py-3">{h.bestStreak}</td>
                    <td className="px-4 py-3 text-amber-300">{h.points ?? "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No sessions yet.
                  </td>
                </tr>
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
    <div data-testid={testId} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-amber-400" />
      </div>
      <div className="mt-3 font-heading text-3xl font-black text-slate-50">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children, testId }) {
  return (
    <div data-testid={testId} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500/80">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyChart() {
  return <div className="grid h-[240px] place-items-center text-sm text-slate-500">Play a session to build charts.</div>;
}
