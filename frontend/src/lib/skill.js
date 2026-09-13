// Adaptive difficulty engine + hidden skill rating (1–10).
import { WORDS } from "@/data/words";
import { getMissed } from "@/lib/storage";

const WEIGHT = { easy: 1, medium: 2, hard: 3, extreme: 4, mixed: 2.5 };
export const DIFF_ORDER = ["easy", "medium", "hard", "extreme"];

export function rankDiff(d) {
  return { easy: 1, medium: 2, hard: 3, extreme: 4 }[d] || 0;
}

// Returns null until the user has attempted at least 10 words.
export function computeSkill(history, stats) {
  const recent = history.slice(0, 25);
  let weighted = 0;
  let total = 0;
  let timeSum = 0;
  let timeN = 0;
  recent.forEach((h) => {
    const n = h.correct + h.incorrect;
    weighted += h.correct * (WEIGHT[h.difficulty] || 2);
    total += n;
    if (h.avgTime) {
      timeSum += h.avgTime * n;
      timeN += n;
    }
  });
  if (total < 10) return null;
  const wAcc = weighted / total; // 0..4
  const avgTime = timeN ? timeSum / timeN : 8;
  const speedBonus = Math.max(0, Math.min(1, (10 - avgTime) / 8));
  const hintPenalty = stats.totalAttempted ? Math.min(0.8, (stats.hintsUsed / stats.totalAttempted) * 1.5) : 0;
  const level = 1 + wAcc * 2 + speedBonus - hintPenalty;
  return Math.round(Math.max(1, Math.min(10, level)) * 10) / 10;
}

export function levelTitle(level) {
  if (level == null) return "Unrated";
  if (level >= 9) return "Grand Champion";
  if (level >= 8) return "Champion";
  if (level >= 6.5) return "Expert";
  if (level >= 5) return "Skilled";
  if (level >= 3.5) return "Improving";
  return "Beginner";
}

export function accuracyAt(history, difficulty) {
  const rows = history.filter((h) => h.difficulty === difficulty).slice(0, 8);
  const c = rows.reduce((a, h) => a + h.correct, 0);
  const t = rows.reduce((a, h) => a + h.correct + h.incorrect, 0);
  return t ? { pct: Math.round((c / t) * 100), n: t } : null;
}

export function recommendDifficulty(history, preferred = "medium") {
  const level = computeSkill(history, { totalAttempted: 0, hintsUsed: 0 });
  const acc = accuracyAt(history, preferred);
  const idx = DIFF_ORDER.indexOf(preferred);
  if (!acc || acc.n < 8) {
    return { difficulty: preferred, reason: "Complete a few sessions and we'll tune this for you.", level };
  }
  if (acc.pct >= 88 && idx < 3) {
    const next = DIFF_ORDER[idx + 1];
    return { difficulty: next, reason: `Your accuracy is ${acc.pct}% on ${cap(preferred)}, so we've increased your challenge.`, level };
  }
  if (acc.pct < 55 && idx > 0) {
    const prev = DIFF_ORDER[idx - 1];
    return { difficulty: prev, reason: `You're at ${acc.pct}% on ${cap(preferred)} — let's rebuild confidence on ${cap(prev)}.`, level };
  }
  return { difficulty: preferred, reason: `You're at ${acc.pct}% on ${cap(preferred)}. Keep pushing — ${acc.pct >= 75 ? "you're close to levelling up." : "consistency wins bees."}`, level };
}

// Which spelling pattern is tripping the user most?
export function weakPattern() {
  const missed = getMissed();
  if (!missed.length) return null;
  const byWord = new Map(WORDS.map((w) => [w.word, w]));
  const counts = {};
  missed.forEach((m) => {
    const w = byWord.get(m.word);
    (w?.patterns || []).forEach((p) => {
      counts[p] = (counts[p] || 0) + m.incorrect;
    });
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 2) return null;
  const pool = WORDS.filter((w) => (w.patterns || []).includes(top[0]));
  return { pattern: top[0], misses: top[1], available: pool.length };
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
