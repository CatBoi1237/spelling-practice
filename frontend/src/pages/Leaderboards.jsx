import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Loader2, Trophy, WifiOff } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { DIFFICULTY_META } from "@/data/words";
import { Eyebrow } from "@/components/ui-bits";
import { BeeMascot } from "@/components/BeeMascot";
import { cn } from "@/lib/utils";

const PERIODS = [["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["all", "All-time"]];
const METRICS = [
  ["score", "Highest score", (v) => `${v.toLocaleString()} pts`],
  ["streak", "Longest streak", (v) => `🔥 ${v}`],
  ["accuracy", "Best accuracy", (v) => `${v}%`],
  ["fastest", "Fastest test", (v) => `${(v / 1000).toFixed(1)}s`],
  ["mastered", "Most words mastered", (v) => `${v} words`],
];

export default function Leaderboards() {
  const { playerId } = useAuth();
  const [period, setPeriod] = useState("weekly");
  const [metric, setMetric] = useState("score");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fmt = METRICS.find((m) => m[0] === metric)[2];

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .get("/leaderboards", { params: { period, metric, player_id: playerId } })
      .then(({ data }) => alive && setData(data))
      .catch((e) => alive && setError(apiError(e, "Leaderboards are unavailable right now.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [period, metric, playerId]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Leaderboards</Eyebrow>
          <h1 className="mt-2 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">Who's top of the hive?</h1>
          <p className="mt-2 max-w-xl text-base text-slate-400">Every finished session counts. Best result per player is shown. <Link to="/daily" className="font-semibold text-amber-400 hover:text-amber-300">Daily Challenge board →</Link></p>
        </div>
        <BeeMascot size={72} mood="happy" />
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="flex overflow-hidden rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold">
          {PERIODS.map(([id, label]) => (
            <button key={id} data-testid={`lb-period-${id}`} onClick={() => setPeriod(id)} className={cn("px-4 py-2 transition-colors", period === id ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-amber-300")}>{label}</button>
          ))}
        </div>
        <select data-testid="lb-metric" value={metric} onChange={(e) => setMetric(e.target.value)} className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 outline-none">
          {METRICS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>

      <div data-testid="leaderboard-table" className="overflow-hidden rounded-3xl border border-slate-800">
        {loading && <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <WifiOff className="h-8 w-8 text-slate-500" />
            <p className="text-sm text-slate-400">{error}</p>
            <p className="text-xs text-slate-500">Practice still works offline — scores sync when you're back online.</p>
          </div>
        )}
        {!loading && !error && data?.entries?.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <BeeMascot size={64} />
            <p className="text-sm text-slate-400">No scores yet for this board. Finish a session and you'll be #1.</p>
          </div>
        )}
        {!loading && !error && data?.entries?.map((row) => (
          <div key={row.player_id} data-testid={`lb-row-${row.rank}`} className={cn("flex items-center gap-4 border-b border-slate-800/70 px-5 py-3 text-sm last:border-b-0", row.player_id === playerId ? "bg-amber-500/10" : "bg-slate-900/30")}>
            <span className="w-8 font-heading text-lg font-black text-slate-500">{row.rank}</span>
            {row.rank === 1 ? <Crown className="h-4 w-4 text-amber-400" /> : <Trophy className="h-4 w-4 text-slate-700" />}
            <span className="flex-1 truncate font-semibold text-slate-200">
              {row.name}
              {row.player_id === playerId && <span className="ml-2 text-xs font-bold text-amber-400">you</span>}
            </span>
            <span className="hidden text-xs text-slate-500 sm:block">{row.mode} · {DIFFICULTY_META[row.difficulty]?.label || row.difficulty}</span>
            <span className="font-mono text-slate-100">{fmt(row.value)}</span>
          </div>
        ))}
      </div>
      {data && !loading && !error && <p className="text-xs text-slate-500">{data.total_players} player{data.total_players === 1 ? "" : "s"} on this board.</p>}
    </div>
  );
}
