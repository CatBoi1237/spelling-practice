import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { getHistory, getMissed } from "@/lib/storage";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { Trophy, Target, Flame, Award } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Progress() {
  const { stats } = useApp();
  const history = useMemo(() => getHistory(), []);
  const missed = useMemo(() => getMissed(), []);

  const accuracy = stats.totalAttempted ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;

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

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard testId="progress-total" icon={Award} label="Words attempted" value={stats.totalAttempted} />
        <SummaryCard testId="progress-accuracy" icon={Target} label="Overall accuracy" value={`${accuracy}%`} />
        <SummaryCard testId="progress-streak" icon={Flame} label="Best streak" value={stats.bestStreak} />
        <SummaryCard testId="progress-completed" icon={Trophy} label="Words completed" value={stats.wordsCompleted} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
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
        <h2 className="font-heading text-2xl font-bold text-slate-100">Commonly misspelled</h2>
        <p className="mt-1 text-sm text-slate-400">These words keep tripping you up — worth another go.</p>
        <div className="mt-4">
          {missed.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {missed.slice(0, 20).map((m) => (
                <div key={m.word} data-testid={`progress-missed-${m.word}`} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                  <div>
                    <div className="font-mono text-lg tracking-widest text-slate-100">{m.word}</div>
                    <div className="text-xs text-slate-400">{m.definition}</div>
                  </div>
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200">×{m.count}</span>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
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

function SummaryCard({ testId, icon: Icon, label, value }) {
  return (
    <div data-testid={testId} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-amber-400" />
      </div>
      <div className="mt-3 font-heading text-3xl font-black text-slate-50">{value}</div>
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
