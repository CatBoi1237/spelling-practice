import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Flame, Loader2, Medal, Sparkles, Trophy, WifiOff } from "lucide-react";
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

const LEAGUES = {
  champion: { label: "Champion", emoji: "👑", className: "border-amber-400/40 bg-amber-400/10 text-amber-200" },
  diamond: { label: "Diamond", emoji: "💎", className: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" },
  gold: { label: "Gold", emoji: "🥇", className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-200" },
  silver: { label: "Silver", emoji: "🥈", className: "border-slate-400/40 bg-slate-300/10 text-slate-200" },
  bronze: { label: "Bronze", emoji: "🥉", className: "border-orange-600/40 bg-orange-600/10 text-orange-200" },
};

function leagueFor(rank, total) {
  if (!rank || !total) return LEAGUES.bronze;
  if (rank === 1) return LEAGUES.champion;
  const percentile = rank / total;
  if (percentile <= 0.1) return LEAGUES.diamond;
  if (percentile <= 0.25) return LEAGUES.gold;
  if (percentile <= 0.5) return LEAGUES.silver;
  return LEAGUES.bronze;
}

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

  const weeklyLeague = period === "weekly" && metric === "score";
  const myEntry = useMemo(
    () => data?.entries?.find((entry) => entry.player_id === playerId) || data?.me || null,
    [data, playerId]
  );
  const myLeague = leagueFor(myEntry?.rank, data?.total_players || data?.entries?.length || 0);

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

      {weeklyLeague && !loading && !error && data?.entries?.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-amber-950/20 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-200">
                <Flame className="h-3.5 w-3.5" /> 7-day league
              </span>
              <h2 className="mt-3 font-heading text-3xl font-black text-slate-50">Weekly competition</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                Your division is based on your position on the rolling seven-day points board. Keep practising to climb from Bronze to Champion.
              </p>
            </div>

            <div className={cn("rounded-2xl border px-5 py-4 text-center", myLeague.className)}>
              <div className="text-3xl">{myLeague.emoji}</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em]">Your league</div>
              <div className="font-heading text-xl font-black">{myLeague.label}</div>
              <div className="mt-1 text-xs opacity-75">{myEntry ? `#${myEntry.rank} this week` : "Finish a session to rank"}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            {Object.values(LEAGUES).reverse().map((league) => (
              <div key={league.label} className={cn("rounded-2xl border px-3 py-3 text-center", league.className)}>
                <div className="text-2xl">{league.emoji}</div>
                <div className="mt-1 text-xs font-black">{league.label}</div>
              </div>
            ))}
          </div>

          {data.entries[0] && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300">Hive leader</div>
                  <div className="font-semibold text-slate-100">{data.entries[0].name}</div>
                </div>
              </div>
              <div className="font-mono text-lg font-black text-amber-300">{Number(data.entries[0].value || 0).toLocaleString()} pts</div>
            </div>
          )}
        </section>
      )}

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
        {!loading && !error && data?.entries?.map((row) => {
          const rowLeague = weeklyLeague ? leagueFor(row.rank, data.total_players || data.entries.length) : null;
          return (
            <div key={row.player_id} data-testid={`lb-row-${row.rank}`} className={cn("flex items-center gap-4 border-b border-slate-800/70 px-5 py-3 text-sm last:border-b-0", row.player_id === playerId ? "bg-amber-500/10" : "bg-slate-900/30")}>
              <span className="w-8 font-heading text-lg font-black text-slate-500">{row.rank}</span>
              {row.rank === 1 ? <Crown className="h-4 w-4 text-amber-400" /> : row.rank <= 3 ? <Medal className="h-4 w-4 text-slate-400" /> : <Trophy className="h-4 w-4 text-slate-700" />}
              <span className="flex-1 truncate font-semibold text-slate-200">
                {row.name}
                {row.player_id === playerId && <span className="ml-2 text-xs font-bold text-amber-400">you</span>}
              </span>
              {rowLeague && (
                <span className={cn("hidden rounded-full border px-2.5 py-1 text-[10px] font-black sm:inline-flex", rowLeague.className)}>
                  {rowLeague.emoji} {rowLeague.label}
                </span>
              )}
              <span className="hidden text-xs text-slate-500 lg:block">{row.mode} · {DIFFICULTY_META[row.difficulty]?.label || row.difficulty}</span>
              <span className="font-mono text-slate-100">{fmt(row.value)}</span>
            </div>
          );
        })}
      </div>
      {data && !loading && !error && <p className="text-xs text-slate-500">{data.total_players} player{data.total_players === 1 ? "" : "s"} on this board.</p>}
    </div>
  );
}
