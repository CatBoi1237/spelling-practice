// Cloud sync for signed-in users: merge local + remote progress, then push.
import { api } from "@/lib/api";
import { KEYS, exportAll } from "@/lib/storage";

const LAST_SYNC = "sb.lastSync.v1";

function maxNum(a, b) {
  return Math.max(Number(a) || 0, Number(b) || 0);
}

export function mergeProgress(local, remote) {
  if (!remote) return local;
  const out = { ...remote, ...local };

  const ls = local[KEYS.stats] || {};
  const rs = remote[KEYS.stats] || {};
  const stats = { ...rs, ...ls };
  ["totalAttempted", "totalCorrect", "totalIncorrect", "bestStreak", "wordsCompleted", "totalPoints", "totalTimeMs", "hintsUsed", "sessions", "perfectSessions", "extremeSessions"].forEach((k) => {
    stats[k] = maxNum(ls[k], rs[k]);
  });
  const fast = [ls.fastestAnswerMs, rs.fastestAnswerMs].filter((v) => v != null);
  stats.fastestAnswerMs = fast.length ? Math.min(...fast) : null;
  out[KEYS.stats] = stats;

  const hist = new Map();
  [...(remote[KEYS.history] || []), ...(local[KEYS.history] || [])].forEach((h) => hist.set(h.date, h));
  out[KEYS.history] = [...hist.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 100);

  const ws = { ...(remote[KEYS.wordStats] || {}) };
  Object.entries(local[KEYS.wordStats] || {}).forEach(([word, l]) => {
    const r = ws[word];
    if (!r) {
      ws[word] = l;
      return;
    }
    const localNewer = (l.lastAttempted || "") >= (r.lastAttempted || "");
    ws[word] = {
      attempts: maxNum(l.attempts, r.attempts),
      correct: maxNum(l.correct, r.correct),
      incorrect: maxNum(l.incorrect, r.incorrect),
      bestStreak: maxNum(l.bestStreak, r.bestStreak),
      streak: localNewer ? l.streak : r.streak,
      lastAttempted: localNewer ? l.lastAttempted : r.lastAttempted,
    };
  });
  out[KEYS.wordStats] = ws;

  out[KEYS.achievements] = { ...(remote[KEYS.achievements] || {}), ...(local[KEYS.achievements] || {}) };

  const ld = local[KEYS.daily] || {};
  const rd = remote[KEYS.daily] || {};
  out[KEYS.daily] = {
    completed: [...new Set([...(rd.completed || []), ...(ld.completed || [])])].sort().slice(-400),
    streak: maxNum(ld.streak, rd.streak),
    bestStreak: maxNum(ld.bestStreak, rd.bestStreak, ld.streak, rd.streak),
  };

  out[KEYS.seen] = local[KEYS.seen] || remote[KEYS.seen] || [];
  out[KEYS.settings] = { ...(remote[KEYS.settings] || {}), ...(local[KEYS.settings] || {}) };
  return out;
}

export function applyProgress(data) {
  Object.entries(data).forEach(([k, v]) => {
    if (Object.values(KEYS).includes(k) && k !== KEYS.theme) localStorage.setItem(k, JSON.stringify(v));
  });
}

export async function pullAndMerge() {
  const { data } = await api.get("/sync");
  const merged = mergeProgress(exportAll(), data?.data || null);
  applyProgress(merged);
  await push();
  return merged;
}

let pending = null;
export function push() {
  clearTimeout(pending);
  return new Promise((resolve) => {
    pending = setTimeout(async () => {
      try {
        const updated_at = new Date().toISOString();
        await api.put("/sync", { data: exportAll(), updated_at });
        localStorage.setItem(LAST_SYNC, updated_at);
        resolve(true);
      } catch {
        resolve(false);
      }
    }, 400);
  });
}

export function lastSyncedAt() {
  return localStorage.getItem(LAST_SYNC);
}
