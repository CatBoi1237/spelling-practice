import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  Download,
  Target,
  Users,
} from "lucide-react";

import { api } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { pickSeededWords } from "@/lib/seeded";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const storageKey = (code) => `spellbee.classroom.report.${code}`;

function emptyReport(code) {
  return {
    code,
    created_at: new Date().toISOString(),
    rounds: {},
    students: {},
  };
}

function loadReport(code) {
  try {
    const raw = localStorage.getItem(storageKey(code));
    if (!raw) return emptyReport(code);
    const parsed = JSON.parse(raw);
    return parsed?.code === code ? parsed : emptyReport(code);
  } catch {
    return emptyReport(code);
  }
}

function saveReport(code, report) {
  try {
    localStorage.setItem(storageKey(code), JSON.stringify(report));
  } catch {
    // The report still works for this page load if browser storage is unavailable.
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function approximateCorrectResponseMs(points, timeLimitMs) {
  const numericPoints = Number(points || 0);
  if (!numericPoints || numericPoints < 200) return timeLimitMs;
  const progress = clamp((1000 - numericPoints) / 800, 0, 1);
  return Math.round(progress * timeLimitMs);
}

function secondsLabel(ms) {
  if (!Number.isFinite(ms)) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

function csvCell(value) {
  let text = String(value ?? "");

  // Prevent spreadsheet formula injection from guest display names.
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export default function ClassroomResultsReport({ roomCode }) {
  const { user } = useAuth();
  const playerId = user?.id || getPlayerId();
  const [room, setRoom] = useState(null);
  const [report, setReport] = useState(() => loadReport(roomCode));

  useEffect(() => {
    setReport(loadReport(roomCode));
  }, [roomCode]);

  const refresh = useCallback(async () => {
    if (!roomCode) return;

    try {
      const { data } = await api.get(`/classrooms/${roomCode}`, {
        params: { player_id: playerId },
      });
      setRoom(data);
    } catch {
      // The main Classroom page already displays room/API errors.
    }
  }, [roomCode, playerId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 500);
    return () => clearInterval(timer);
  }, [refresh]);

  const hostWords = useMemo(() => {
    if (room?.role !== "host" || !room?.seed) return [];

    try {
      return pickSeededWords(room.seed, room.word_count, room.difficulty);
    } catch {
      return [];
    }
  }, [room?.role, room?.seed, room?.word_count, room?.difficulty]);

  useEffect(() => {
    if (room?.role !== "host" || room.round_index < 0) return;

    const roundIndex = room.round_index;
    const startedAt = room.round_started_at ? Date.parse(room.round_started_at) : null;
    const timeLimitMs = Number(room.time_limit_ms || 0);
    const currentWord =
      room.current_word ||
      room.correct_word ||
      hostWords[roundIndex]?.word ||
      "";

    setReport((previous) => {
      const next = JSON.parse(JSON.stringify(previous || emptyReport(roomCode)));
      next.code = roomCode;
      next.students ||= {};
      next.rounds ||= {};

      for (const student of room.students || []) {
        next.students[student.player_id] = {
          ...(next.students[student.player_id] || {}),
          player_id: student.player_id,
          name: student.name,
          registered: Boolean(student.registered),
        };
      }

      const key = String(roundIndex);
      const round = {
        ...(next.rounds[key] || {}),
        index: roundIndex,
        word: currentWord || next.rounds[key]?.word || "",
        started_at: room.round_started_at || next.rounds[key]?.started_at || null,
        time_limit_ms: timeLimitMs || next.rounds[key]?.time_limit_ms || 0,
        answers: { ...(next.rounds[key]?.answers || {}) },
      };

      // While the timer is active, remember roughly when each student's answer
      // first becomes visible to the teacher. Correct-answer timing is later
      // refined from the server-calculated points value.
      if (!room.revealed && startedAt && timeLimitMs > 0) {
        for (const student of room.students || []) {
          if (!student.answered || round.answers[student.player_id]?.response_ms != null) {
            continue;
          }

          round.answers[student.player_id] = {
            ...(round.answers[student.player_id] || {}),
            response_ms: clamp(Date.now() - startedAt, 0, timeLimitMs),
          };
        }
      }

      if (room.revealed) {
        for (const student of room.students || []) {
          const existing = round.answers[student.player_id] || {};
          const answered = Boolean(student.answered);
          const correct = answered ? Boolean(student.round_correct) : false;
          const points = answered ? Number(student.round_points || 0) : 0;

          let responseMs = existing.response_ms;

          if (correct && timeLimitMs > 0) {
            responseMs = approximateCorrectResponseMs(points, timeLimitMs);
          } else if (responseMs == null && answered && startedAt && timeLimitMs > 0) {
            responseMs = clamp(Date.now() - startedAt, 0, timeLimitMs);
          } else if (responseMs == null && timeLimitMs > 0) {
            responseMs = timeLimitMs;
          }

          round.answers[student.player_id] = {
            ...existing,
            answered,
            correct,
            points,
            response_ms: responseMs,
          };
        }

        round.finalized = true;
        round.revealed_at = round.revealed_at || new Date().toISOString();
      }

      next.rounds[key] = round;

      const before = JSON.stringify(previous);
      const after = JSON.stringify(next);

      if (before === after) return previous;

      saveReport(roomCode, next);
      return next;
    });
  }, [room, roomCode, hostWords]);

  const rows = useMemo(() => {
    if (!room || room.role !== "host") return [];

    const finalizedRounds = Object.values(report?.rounds || {})
      .filter((round) => round.finalized)
      .sort((a, b) => a.index - b.index);

    return (room.students || [])
      .map((student) => {
        const attempts = finalizedRounds.map((round) => {
          const attempt = round.answers?.[student.player_id] || {};
          return {
            word: round.word || `Word ${round.index + 1}`,
            correct: Boolean(attempt.correct),
            points: Number(attempt.points || 0),
            response_ms: Number.isFinite(attempt.response_ms)
              ? attempt.response_ms
              : null,
          };
        });

        const correct = attempts.filter((attempt) => attempt.correct).length;
        const total = attempts.length;
        const responseTimes = attempts
          .map((attempt) => attempt.response_ms)
          .filter((value) => Number.isFinite(value));
        const avgResponseMs = responseTimes.length
          ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
          : null;
        const missedWords = attempts
          .filter((attempt) => !attempt.correct)
          .map((attempt) => attempt.word);

        return {
          player_id: student.player_id,
          name: student.name,
          points: Number(student.total_points || 0),
          correct,
          total,
          accuracy: total ? Math.round((correct / total) * 100) : 0,
          avg_response_ms: avgResponseMs,
          missed_words: missedWords,
        };
      })
      .sort((a, b) => b.points - a.points || b.accuracy - a.accuracy || a.name.localeCompare(b.name))
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }, [room, report]);

  const finalizedRoundCount = useMemo(
    () => Object.values(report?.rounds || {}).filter((round) => round.finalized).length,
    [report]
  );

  const classStats = useMemo(() => {
    const correct = rows.reduce((sum, row) => sum + row.correct, 0);
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const responseTimes = rows
      .map((row) => row.avg_response_ms)
      .filter((value) => Number.isFinite(value));

    return {
      accuracy: total ? Math.round((correct / total) * 100) : 0,
      avg_response_ms: responseTimes.length
        ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
        : null,
    };
  }, [rows]);

  const downloadCsv = () => {
    if (!rows.length) {
      toast.error("There are no classroom results to export yet.");
      return;
    }

    const header = [
      "Rank",
      "Student",
      "Points",
      "Correct",
      "Words scored",
      "Accuracy (%)",
      "Average response (seconds)",
      "Missed words",
    ];

    const csvRows = rows.map((row) => [
      row.rank,
      row.name,
      row.points,
      row.correct,
      row.total,
      row.accuracy,
      Number.isFinite(row.avg_response_ms) ? (row.avg_response_ms / 1000).toFixed(2) : "",
      row.missed_words.join("; "),
    ]);

    const csv = [header, ...csvRows]
      .map((line) => line.map(csvCell).join(","))
      .join("\r\n");

    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spellbee-classroom-${roomCode}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.success("Classroom report downloaded.");
  };

  if (room?.role !== "host" || room.status !== "finished") {
    return null;
  }

  const reportIsPartial = finalizedRoundCount < room.word_count;

  return (
    <section className="mx-auto mt-6 max-w-6xl rounded-3xl border border-amber-500/25 bg-slate-900/60 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
            <BarChart3 className="h-4 w-4" />
            Teacher report
          </div>
          <h2 className="mt-2 font-heading text-3xl font-black text-slate-50">
            Classroom results
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Review scores, accuracy, missed words and response time for room {roomCode}.
          </p>
        </div>

        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {reportIsPartial && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p>
            This browser recorded {finalizedRoundCount} of {room.word_count} revealed words. The report is partial, usually because the teacher page was refreshed or reopened after earlier rounds.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            <Users className="h-4 w-4" />
            Students
          </div>
          <div className="mt-2 text-3xl font-black text-slate-50">{rows.length}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            <Target className="h-4 w-4" />
            Class accuracy
          </div>
          <div className="mt-2 text-3xl font-black text-slate-50">{classStats.accuracy}%</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            <Clock3 className="h-4 w-4" />
            Avg response
          </div>
          <div className="mt-2 text-3xl font-black text-slate-50">
            {secondsLabel(classStats.avg_response_ms)}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Points</th>
              <th className="px-4 py-3">Accuracy</th>
              <th className="px-4 py-3">Avg response</th>
              <th className="px-4 py-3">Missed words</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/40">
            {rows.map((row) => (
              <tr key={row.player_id} className="align-top">
                <td className="px-4 py-4 font-bold text-amber-300">{row.rank}</td>
                <td className="px-4 py-4 font-semibold text-slate-100">{row.name}</td>
                <td className="px-4 py-4 font-bold text-slate-100">{row.points.toLocaleString()}</td>
                <td className="px-4 py-4 text-slate-300">
                  {row.correct}/{row.total} <span className="text-slate-500">({row.accuracy}%)</span>
                </td>
                <td className="px-4 py-4 text-slate-300">{secondsLabel(row.avg_response_ms)}</td>
                <td className="max-w-md px-4 py-4 text-slate-400">
                  {row.missed_words.length ? row.missed_words.join(", ") : "None — perfect score"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Response time is captured while the teacher page is open. Correct-answer timing is refined from the server-scored speed points; other response times are observed by the teacher browser and may vary slightly because the room updates over the network.
      </p>
    </section>
  );
}
