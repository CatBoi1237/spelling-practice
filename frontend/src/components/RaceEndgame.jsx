import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Copy,
  RotateCcw,
  Target,
  TimerReset,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { api, apiError } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { useAuth } from "@/context/AuthContext";
import { EndgameHero, HighlightCard, Podium } from "@/components/Celebration";

function sortedPlayers(players = []) {
  return [...players].sort((a, b) =>
    (b.score || 0) - (a.score || 0) ||
    (a.total_time_ms || Infinity) - (b.total_time_ms || Infinity) ||
    a.name.localeCompare(b.name)
  );
}

function averageMs(player) {
  const answered = Number(player?.answered || 0);
  if (!answered) return null;
  return Math.round(Number(player.total_time_ms || 0) / answered);
}

function timeLabel(ms) {
  if (!Number.isFinite(ms)) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function RaceEndgame() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();
  const navigate = useNavigate();
  const { user } = useAuth();
  const playerId = user?.id || getPlayerId();

  const [room, setRoom] = useState(null);
  const [rematchBusy, setRematchBusy] = useState(false);
  const firstRunningRanksRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get(`/rooms/${roomCode}`);
      setRoom(data);

      if (data.status === "running" && !firstRunningRanksRef.current) {
        const ordered = sortedPlayers(data.players);
        firstRunningRanksRef.current = Object.fromEntries(
          ordered.map((player, index) => [player.player_id, index + 1])
        );
      }
    } catch {
      // The underlying Room page owns API error handling.
    }
  }, [roomCode]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 850);
    return () => clearInterval(timer);
  }, [refresh]);

  const finalPlayers = useMemo(
    () => (room?.status === "finished" ? sortedPlayers(room.players) : []),
    [room]
  );

  if (room?.status !== "finished" || !finalPlayers.length) return null;

  const meIndex = finalPlayers.findIndex((player) => player.player_id === playerId);
  const me = meIndex >= 0 ? finalPlayers[meIndex] : null;
  const winner = finalPlayers[0];
  const fastest = [...finalPlayers]
    .filter((player) => averageMs(player) != null)
    .sort((a, b) => averageMs(a) - averageMs(b))[0];
  const perfect = finalPlayers.filter((player) => player.score === room.word_count);

  const comeback = (() => {
    const initial = firstRunningRanksRef.current;
    if (!initial) return null;
    return finalPlayers
      .map((player, index) => ({
        ...player,
        placesGained: (initial[player.player_id] || index + 1) - (index + 1),
      }))
      .sort((a, b) => b.placesGained - a.placesGained)[0];
  })();

  const margin = finalPlayers.length > 1
    ? Math.max(0, (winner.score || 0) - (finalPlayers[1].score || 0))
    : winner.score || 0;

  const myAccuracy = me
    ? Math.round(((me.score || 0) / Math.max(1, room.word_count)) * 100)
    : null;

  const shareResult = async () => {
    if (!me) return;
    const grid = `${"🟩".repeat(me.score || 0)}${"🟥".repeat(Math.max(0, room.word_count - (me.score || 0)))}`;
    const text = `🐝 SpellBee Race ${roomCode}\n#${meIndex + 1} · ${me.score}/${room.word_count} · ${myAccuracy}%\n${grid}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "SpellBee Race Result", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Race result copied!");
      }
    } catch (error) {
      if (error?.name !== "AbortError") toast.error("Could not share the result.");
    }
  };

  const rematch = async () => {
    setRematchBusy(true);
    try {
      await api.post(`/rooms/${roomCode}/rematch`, { player_id: playerId });
      firstRunningRanksRef.current = null;
      toast.success("Rematch lobby ready — everyone needs to ready up again.");
      window.location.reload();
    } catch (error) {
      toast.error(apiError(error, "Could not start a rematch."));
    } finally {
      setRematchBusy(false);
    }
  };

  return (
    <div className="mx-auto mb-7 max-w-6xl space-y-5">
      <EndgameHero
        eyebrow="Race complete"
        title={meIndex === 0 ? "You won the spelling race!" : `${winner.name} takes the crown`}
        subtitle={
          me
            ? `You finished #${meIndex + 1} with ${me.score}/${room.word_count} correct. Here’s how the race shook out.`
            : `${room.word_count} words are complete. Final standings are locked in.`
        }
        icon={Trophy}
      >
        <Podium
          entries={finalPlayers.map((player) => ({
            ...player,
            id: player.player_id,
          }))}
          scoreLabel="correct"
        />
      </EndgameHero>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HighlightCard
          icon={Zap}
          label="Fastest average"
          value={fastest?.name || "—"}
          detail={fastest ? `${timeLabel(averageMs(fastest))} per word` : "No timing data"}
          accent="text-sky-300"
        />
        <HighlightCard
          icon={Target}
          label="Perfect scores"
          value={perfect.length ? perfect.length : "None"}
          detail={perfect.length ? perfect.map((player) => player.name).join(", ") : "Nobody went flawless this time"}
          accent="text-emerald-300"
        />
        <HighlightCard
          icon={TrendingUp}
          label="Biggest comeback"
          value={comeback && comeback.placesGained > 0 ? comeback.name : "Tight race"}
          detail={comeback && comeback.placesGained > 0 ? `Climbed ${comeback.placesGained} place${comeback.placesGained === 1 ? "" : "s"}` : "No major position swing recorded"}
          accent="text-violet-300"
        />
        <HighlightCard
          icon={TimerReset}
          label="Winning margin"
          value={`${margin} word${margin === 1 ? "" : "s"}`}
          detail={finalPlayers.length > 1 ? `${winner.name} over ${finalPlayers[1].name}` : "Solo finish"}
          accent="text-amber-300"
        />
      </section>

      {me && (
        <section className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/55 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Your scorecard</div>
            <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
              <div className="font-heading text-3xl font-black text-slate-50">#{meIndex + 1}</div>
              <div className="text-sm text-slate-400"><strong className="text-emerald-300">{myAccuracy}%</strong> accuracy</div>
              <div className="text-sm text-slate-400"><strong className="text-sky-300">{timeLabel(averageMs(me))}</strong> average</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={shareResult}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400"
            >
              <Copy className="h-4 w-4" /> Share score
            </button>
            {room.host_id === playerId && (
              <button
                type="button"
                onClick={rematch}
                disabled={rematchBusy}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2.5 text-sm font-bold text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" /> {rematchBusy ? "Starting…" : "Rematch"}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/multiplayer")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm font-bold text-slate-200 hover:border-amber-500/40 hover:text-amber-300"
            >
              New race <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      <style>{`
        .race-shell [data-testid="room-finished"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
