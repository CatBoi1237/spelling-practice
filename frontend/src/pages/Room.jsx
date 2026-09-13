import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Crown, Loader2, Play, Share2, Users } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { getPlayerId, getPlayerName } from "@/lib/identity";
import { pickSeededWords } from "@/lib/seeded";
import { useAuth } from "@/context/AuthContext";
import SpellRound from "@/components/SpellRound";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Room() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();
  const { user, playerName } = useAuth();
  const playerId = user?.id || getPlayerId();

  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [myResults, setMyResults] = useState([]);
  const joinedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get(`/rooms/${roomCode}`);
      setRoom(data);
    } catch (e) {
      setError(apiError(e, "Room not found."));
    }
  }, [roomCode]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.post(`/rooms/${roomCode}/join`, {
          player_id: playerId,
          name: user?.name || playerName || getPlayerName(),
        });
        if (!alive) return;
        joinedRef.current = true;
        setRoom(data);
      } catch (e) {
        if (alive) setError(apiError(e, "Could not join this room."));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  useEffect(() => {
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  const words = useMemo(
    () => (room ? pickSeededWords(room.seed, room.word_count, room.difficulty) : []),
    [room?.seed, room?.word_count, room?.difficulty] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const me = room?.players?.find((p) => p.player_id === playerId);
  const isHost = room?.host_id === playerId;

  const start = async () => {
    try {
      const { data } = await api.post(`/rooms/${roomCode}/start`, { player_id: playerId });
      setRoom(data);
    } catch (e) {
      toast.error(apiError(e, "Could not start the race."));
    }
  };

  const onResult = async ({ correct, timeMs }) => {
    const next = [...myResults, correct];
    setMyResults(next);
    try {
      const { data } = await api.post(`/rooms/${roomCode}/progress`, {
        player_id: playerId,
        correct,
        time_ms: timeMs,
      });
      setRoom(data);
    } catch (e) {
      toast.error(apiError(e, "Score not synced."));
    }
    if (next.length >= words.length) {
      try {
        const { data } = await api.post(`/rooms/${roomCode}/finish`, { player_id: playerId });
        setRoom(data);
      } catch {
        /* polling will catch up */
      }
    } else {
      setIndex(next.length);
    }
  };

  const inviteUrl = `${window.location.origin}/room/${roomCode}`;
  const inviteText = `🐝 Spell-race me! Room ${roomCode}`;

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied!");
    } catch {
      toast.error("Could not copy the invite link.");
    }
  };

  const shareInvite = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "SpellBee Race",
          text: inviteText,
          url: inviteUrl,
        });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success("Sharing isn't available here, so the link was copied!");
      }
    } catch (e) {
      if (e?.name !== "AbortError") {
        toast.error("Could not share the invite.");
      }
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <h2 className="font-heading text-2xl font-bold text-rose-200">{error}</h2>
        <Link data-testid="back-to-multiplayer" to="/multiplayer" className="mt-6 inline-block rounded-lg bg-rose-500 px-5 py-2 font-semibold text-white">
          Back to multiplayer
        </Link>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="grid place-items-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const myDone = me?.done || myResults.length >= words.length;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <header className="rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-950 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-300/80">Room code</div>
              <div data-testid="room-code" className="mt-1 font-mono text-4xl font-black tracking-[0.3em] text-slate-50">
                {roomCode}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {room.word_count} words · <span className="capitalize">{room.difficulty}</span> ·{" "}
                <span data-testid="room-status" className="capitalize">{room.status}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                data-testid="copy-invite-button"
                onClick={copyInviteLink}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-300"
              >
                <Copy className="h-4 w-4" /> Copy invite link
              </button>

              <button
                data-testid="share-invite-button"
                onClick={shareInvite}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>
        </header>

        {room.status === "lobby" && (
          <div data-testid="room-lobby" className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 font-heading text-2xl font-bold text-slate-100">
              <Users className="h-5 w-5 text-amber-400" /> Waiting room
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Share the code above. Everyone gets the exact same words, so it is a fair race.
            </p>
            {isHost ? (
              <button
                data-testid="start-race-button"
                onClick={start}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-400"
              >
                <Play className="h-4 w-4" /> Start race
              </button>
            ) : (
              <p data-testid="waiting-for-host" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-5 py-3 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" /> Waiting for the host to start…
              </p>
            )}
          </div>
        )}

        {room.status !== "lobby" && !myDone && words[index] && (
          <SpellRound
            key={words[index].word}
            word={words[index]}
            index={index}
            total={words.length}
            maxPlays={2}
            label={`Race · ${roomCode}`}
            onResult={onResult}
          />
        )}

        {room.status !== "lobby" && myDone && (
          <div data-testid="room-finished" className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8">
            <h2 className="font-heading text-3xl font-black text-slate-50">
              You scored {me?.score ?? myResults.filter(Boolean).length}/{room.word_count}
            </h2>
            <p className="mt-2 text-sm text-emerald-100/80">
              {room.status === "finished" ? "Everyone has finished — final standings are revealed." : "Waiting for the others to finish… results are revealed when everyone is done."}
            </p>
            <div className="mt-5 text-2xl tracking-[0.2em]">{myResults.map((r) => (r ? "🟩" : "🟥")).join("")}</div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                data-testid="share-race-result-button"
                onClick={async () => {
                  const text = `🐝 Spell-race ${roomCode}: ${me?.score ?? 0}/${room.word_count} ${myResults.map((r) => (r ? "🟩" : "🟥")).join("")}`;
                  try {
                    if (navigator.share) await navigator.share({ text });
                    else {
                      await navigator.clipboard.writeText(text);
                      toast.success("Result copied!");
                    }
                  } catch {
                    toast.error("Could not share.");
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-400"
              >
                <Copy className="h-4 w-4" /> Share result
              </button>
              <Link
                to="/multiplayer"
                data-testid="new-race-link"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-amber-500/40 hover:text-amber-300"
              >
                New race
              </Link>
            </div>
          </div>
        )}
      </div>

      <aside className="lg:col-span-1">
        <div className="sticky top-24 rounded-3xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="font-heading text-lg font-bold text-slate-100">{room.status === "finished" ? "🏆 Final results" : room.status === "running" ? "Race progress" : "Players"}</h3>
          {room.status === "running" && <p className="mt-1 text-xs text-slate-500">Scores are hidden until everyone finishes.</p>}
          <div data-testid="room-leaderboard" className="mt-4 space-y-2">
            {(room.status === "running" ? [...room.players].sort((a, b) => b.answered - a.answered || a.name.localeCompare(b.name)) : room.players).map((p, i) => (
              <div
                key={p.player_id}
                data-testid={`room-player-${i + 1}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                  p.player_id === playerId ? "border-amber-500/40 bg-amber-500/10" : "border-slate-800 bg-slate-950/50"
                )}
              >
                <span className="w-6 font-heading text-base font-black text-slate-500">{room.status === "finished" ? ["🥇", "🥈", "🥉"][i] || i + 1 : i + 1}</span>
                {i === 0 && room.status === "finished" ? <Crown className="h-4 w-4 text-amber-400" /> : null}
                <span className="flex-1 truncate font-semibold text-slate-200">
                  {p.name}
                  {p.player_id === room.host_id && <span className="ml-2 text-[10px] font-bold uppercase text-indigo-300">host</span>}
                </span>
                {room.status === "finished" ? (
                  <>
                    <span className="font-mono text-slate-100">{p.score}/{room.word_count}</span>
                    <span className="w-10 text-right text-[10px] text-slate-500">{Math.round((p.total_time_ms || 0) / 1000)}s</span>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-500">{p.done ? "finished" : room.status === "lobby" ? "ready" : `${p.answered}/${room.word_count}`}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
