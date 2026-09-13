import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Brain, Gauge, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { useAuth } from "@/context/AuthContext";
import { EndgameHero, HighlightCard, Podium } from "@/components/Celebration";

const reportKey = (code) => `spellbee.classroom.report.${code}`;

function readTeacherReport(code) {
  try {
    return JSON.parse(localStorage.getItem(reportKey(code)) || "null");
  } catch {
    return null;
  }
}

function standings(students = []) {
  return [...students].sort((a, b) =>
    Number(b.total_points || 0) - Number(a.total_points || 0) ||
    a.name.localeCompare(b.name)
  );
}

function responseLabel(ms) {
  if (!Number.isFinite(ms)) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ClassroomEndgame() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();
  const navigate = useNavigate();
  const { user } = useAuth();
  const playerId = user?.id || getPlayerId();
  const [room, setRoom] = useState(null);
  const firstRunningRanksRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get(`/classrooms/${roomCode}`, {
        params: { player_id: playerId },
      });
      setRoom(data);

      if (data.status === "running" && !firstRunningRanksRef.current) {
        firstRunningRanksRef.current = Object.fromEntries(
          standings(data.students).map((student, index) => [student.player_id, index + 1])
        );
      }
    } catch {
      // The main Classroom page owns room error handling.
    }
  }, [roomCode, playerId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 900);
    return () => clearInterval(timer);
  }, [refresh]);

  const sorted = useMemo(
    () => (room?.status === "finished" ? standings(room.students) : []),
    [room]
  );

  if (room?.status !== "finished" || !sorted.length) return null;

  const teacherReport = room.role === "host" ? readTeacherReport(roomCode) : null;
  const reportRounds = Object.values(teacherReport?.rounds || {}).filter((round) => round?.finalized);
  const myRank = sorted.findIndex((student) => student.player_id === playerId);
  const winner = sorted[0];
  const second = sorted[1];

  const hardestRound = reportRounds.length
    ? [...reportRounds]
        .map((round) => ({
          ...round,
          misses: Object.values(round.answers || {}).filter((answer) => !answer?.correct).length,
        }))
        .sort((a, b) => b.misses - a.misses || a.index - b.index)[0]
    : null;

  const reportStudents = Object.values(teacherReport?.students || {});
  const allAttempts = reportRounds.flatMap((round) => Object.values(round.answers || {}));
  const correctAttempts = allAttempts.filter((answer) => answer?.correct);
  const classAccuracy = allAttempts.length
    ? Math.round((correctAttempts.length / allAttempts.length) * 100)
    : null;

  const fastestStudent = reportStudents.length && reportRounds.length
    ? reportStudents
        .map((student) => {
          const times = reportRounds
            .map((round) => round.answers?.[student.player_id]?.response_ms)
            .filter((value) => Number.isFinite(value));
          return {
            ...student,
            average: times.length
              ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length)
              : Infinity,
          };
        })
        .filter((student) => Number.isFinite(student.average))
        .sort((a, b) => a.average - b.average)[0]
    : null;

  const comeback = (() => {
    const initial = firstRunningRanksRef.current;
    if (!initial) return null;
    return sorted
      .map((student, index) => ({
        ...student,
        placesGained: (initial[student.player_id] || index + 1) - (index + 1),
      }))
      .sort((a, b) => b.placesGained - a.placesGained)[0];
  })();

  const winningGap = second
    ? Number(winner.total_points || 0) - Number(second.total_points || 0)
    : Number(winner.total_points || 0);

  return (
    <div className="classroom-endgame mx-auto mb-7 max-w-6xl space-y-5">
      <EndgameHero
        eyebrow="Classroom complete"
        title={myRank === 0 ? "You topped the class!" : `${winner.name} wins the bee`}
        subtitle={
          myRank >= 0
            ? `You finished #${myRank + 1} with ${Number(sorted[myRank].total_points || 0).toLocaleString()} points.`
            : `${room.word_count} words are complete. The final leaderboard is locked in.`
        }
        icon={Trophy}
      >
        <Podium
          entries={sorted.map((student) => ({
            ...student,
            id: student.player_id,
            score: student.total_points,
          }))}
          scoreLabel="pts"
        />
      </EndgameHero>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HighlightCard
          icon={Brain}
          label="Hardest word"
          value={hardestRound?.word || "Recorded by teacher"}
          detail={hardestRound ? `${hardestRound.misses} student${hardestRound.misses === 1 ? "" : "s"} missed it` : "Detailed round stats are available on the teacher device"}
          accent="text-rose-300"
        />
        <HighlightCard
          icon={Target}
          label="Class accuracy"
          value={classAccuracy == null ? "—" : `${classAccuracy}%`}
          detail={classAccuracy == null ? "Teacher report tracks this" : `${correctAttempts.length}/${allAttempts.length} correct answers`}
          accent="text-emerald-300"
        />
        <HighlightCard
          icon={Zap}
          label="Fastest speller"
          value={fastestStudent?.name || "—"}
          detail={fastestStudent ? `${responseLabel(fastestStudent.average)} average response` : "Teacher timing data unavailable here"}
          accent="text-sky-300"
        />
        <HighlightCard
          icon={TrendingUp}
          label="Biggest comeback"
          value={comeback && comeback.placesGained > 0 ? comeback.name : "Steady standings"}
          detail={comeback && comeback.placesGained > 0 ? `Climbed ${comeback.placesGained} place${comeback.placesGained === 1 ? "" : "s"}` : `Winning gap: ${winningGap.toLocaleString()} points`}
          accent="text-violet-300"
        />
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/55 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            {room.role === "host" ? "Teacher summary" : "Your finish"}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
            <span><strong className="text-slate-100">{sorted.length}</strong> students</span>
            <span><strong className="text-amber-300">{Number(winner.total_points || 0).toLocaleString()}</strong> winning points</span>
            <span><strong className="text-sky-300">{room.word_count}</strong> words</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/multiplayer")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400"
        >
          New classroom <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <style>{`
        .classroom-shell .classroom-endgame + * [data-classroom-finished="true"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
