import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Flame, Share2, Trophy, Crown, Loader2, Lock } from "lucide-react";
import { api, apiError } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { pickDailyWords } from "@/lib/seeded";
import { getDailyLocal, saveDailyLocal } from "@/lib/storage";
import { push as pushSync } from "@/lib/sync";
import { BeeMascot } from "@/components/BeeMascot";
import { useAuth } from "@/context/AuthContext";
import SpellRound from "@/components/SpellRound";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Daily() {
  const { user, playerName } = useAuth();
  const playerId = user?.id || getPlayerId();

  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState(null);
  const [board, setBoard] = useState([]);
  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [startedAt, setStartedAt] = useState(0);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBoard = useCallback(async (date) => {
    const { data } = await api.get("/daily/leaderboard", { params: { date } });
    setBoard(data.entries || []);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: m } = await api.get("/daily/today");
        if (!alive) return;
        setMeta(m);
        const { data: s } = await api.get("/daily/status", { params: { player_id: playerId, date: m.date } });
        if (!alive) return;
        setStatus(s);
        if (s.streak != null) {
          const local = getDailyLocal();
          saveDailyLocal({ ...local, streak: s.streak, bestStreak: Math.max(local.bestStreak || 0, s.streak) });
        }
        if (s.played) {
          setSubmission({ entry: s.entry });
          setPhase("done");
        }
        await loadBoard(m.date);
      } catch (e) {
        toast.error(apiError(e, "Could not load today's challenge."));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [playerId, loadBoard]);

  const saveLocal = (date, streak) => {
    const local = getDailyLocal();
    const completed = Array.from(new Set([...(local.completed || []), date])).slice(-400);
    saveDailyLocal({ completed, streak, bestStreak: Math.max(local.bestStreak || 0, streak) });
    if (user) pushSync();
  };

  const words = useMemo(() => (meta ? pickDailyWords(meta.seed, meta.word_count) : []), [meta]);

  const onResult = async ({ correct }) => {
    const next = [...results, correct];
    setResults(next);
    if (next.length >= words.length) {
      try {
        const { data } = await api.post("/daily/submit", {
          player_id: playerId,
          name: playerName,
          date: meta.date,
          results: next,
          time_ms: Date.now() - startedAt,
        });
        setSubmission(data);
        setStatus((s) => ({ ...s, played: true, entry: data.entry, streak: data.entry.streak }));
        saveLocal(meta.date, data.entry.streak);
      } catch (e) {
        toast.error(apiError(e, "Could not save your score."));
        const local = getDailyLocal();
        const streak = (local.streak || 0) + 1;
        saveLocal(meta.date, streak);
        setSubmission({ entry: { score: next.filter(Boolean).length, total: words.length, results: next, puzzle_number: meta.puzzle_number, streak } });
      }
      await loadBoard(meta.date);
      setPhase("done");
    } else {
      setIndex(next.length);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300">
            <CalendarDays className="h-3 w-3" /> Daily Word · #{meta?.puzzle_number}
          </span>
          <h1 className="mt-4 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">
            Today&apos;s five words.
          </h1>
          <p className="mt-2 max-w-xl text-base text-slate-400">
            Everyone in the world gets the same five words today. One attempt only — then share your grid and compare streaks.
          </p>
        </div>
        <div data-testid="daily-streak" className="flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
          <BeeMascot size={44} mood={(status?.streak ?? 0) > 0 ? "happy" : "idle"} />
          <Flame className="h-5 w-5 text-orange-400" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300/80">Daily streak</div>
            <div className="font-heading text-2xl font-black text-slate-50">{status?.streak ?? 0}</div>
          </div>
        </div>
      </header>

      {phase === "intro" && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-7 sm:p-10">
          <h2 className="font-heading text-2xl font-bold text-slate-100">How it works</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li>· 5 words, easy → extreme. Same set for every player today.</li>
            <li>· You may hear each word up to 3 times. No sentence hints.</li>
            <li>· One attempt per day. Your grid is shareable when you finish.</li>
          </ul>
          <button
            data-testid="start-daily-button"
            onClick={() => {
              setStartedAt(Date.now());
              setPhase("playing");
            }}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-400"
          >
            Start today&apos;s challenge
          </button>
          {!user && (
            <p className="mt-4 text-xs text-slate-500">
              Playing as guest <span className="font-semibold text-slate-300">{playerName}</span>.{" "}
              <Link to="/signin" className="font-semibold text-amber-400 hover:text-amber-300">Sign in</Link> to keep your streak safe.
            </p>
          )}
        </div>
      )}

      {phase === "playing" && words[index] && (
        <SpellRound
          key={words[index].word}
          word={words[index]}
          index={index}
          total={words.length}
          maxPlays={3}
          label={`Daily #${meta.puzzle_number}`}
          onResult={onResult}
        />
      )}

      {phase === "done" && submission && <Scorecard submission={submission} meta={meta} playerName={playerName} />}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl font-bold text-slate-100">Today&apos;s leaderboard</h2>
          <span className="text-xs font-semibold text-slate-500">{board.length} player{board.length === 1 ? "" : "s"}</span>
        </div>
        <div data-testid="daily-leaderboard" className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
          {board.length === 0 && (
            <p className="px-5 py-6 text-sm text-slate-500">Nobody has played today yet — be the first on the board.</p>
          )}
          {board.map((row) => (
            <div
              key={row.player_id}
              data-testid={`leaderboard-row-${row.rank}`}
              className={cn(
                "flex items-center gap-4 border-b border-slate-800/70 px-5 py-3 text-sm last:border-b-0",
                row.player_id === playerId ? "bg-amber-500/10" : "bg-slate-900/30"
              )}
            >
              <span className="w-8 font-heading text-lg font-black text-slate-500">{row.rank}</span>
              {row.rank === 1 ? <Crown className="h-4 w-4 text-amber-400" /> : <Trophy className="h-4 w-4 text-slate-700" />}
              <span className="flex-1 truncate font-semibold text-slate-200">
                {row.name}
                {row.player_id === playerId && <span className="ml-2 text-xs font-bold text-amber-400">you</span>}
              </span>
              {row.streak > 1 && <span className="text-xs text-orange-300">🔥 {row.streak}</span>}
              <span className="font-mono text-slate-300">{row.score}/{row.total}</span>
              <span className="w-14 text-right font-mono text-xs text-slate-500">{Math.round(row.time_ms / 1000)}s</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Scorecard({ submission, meta, playerName }) {
  const entry = submission.entry;
  const grid = (entry.results || []).map((r) => (r ? "🟩" : "🟥")).join("");
  const shareText = [
    `🐝 Spelling Bee Daily #${entry.puzzle_number ?? meta.puzzle_number}`,
    `${entry.score}/${entry.total} ${grid}`,
    entry.streak ? `🔥 ${entry.streak}-day streak` : null,
    window.location.origin + "/daily",
  ]
    .filter(Boolean)
    .join("\n");

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      toast.success("Scorecard copied — paste it to your friends!");
    } catch {
      toast.error("Could not share. Copy the grid manually.");
    }
  };

  return (
    <div data-testid="daily-scorecard" className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-7 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500/80">Scorecard · {playerName}</div>
          <h2 className="mt-2 font-heading text-3xl font-black text-slate-50">
            {entry.score}/{entry.total} correct
          </h2>
        </div>
        {submission.rank && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Rank today</div>
            <div className="font-heading text-2xl font-black text-amber-300">
              #{submission.rank}
              <span className="text-sm text-slate-500"> / {submission.total_players}</span>
            </div>
          </div>
        )}
      </div>

      <div data-testid="score-grid" className="mt-6 text-3xl tracking-[0.2em]">{grid}</div>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button
          data-testid="share-scorecard-button"
          onClick={share}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-400"
        >
          <Share2 className="h-4 w-4" /> Share scorecard
        </button>
        <Link
          to="/multiplayer"
          data-testid="scorecard-multiplayer-link"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-300"
        >
          Race a friend live
        </Link>
      </div>

      <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
        <Lock className="h-3 w-3" /> One attempt per day. Come back tomorrow for Daily #{(entry.puzzle_number ?? meta.puzzle_number) + 1}.
      </p>
    </div>
  );
}
