// Cloud sync for signed-in users: merge local + remote progress, then push.
import { api } from "@/lib/api";
import { KEYS, exportAll } from "@/lib/storage";
import { mergePracticeDays, daysFromHistory, mergeArcadeRecords, recordsFromHistory } from "@/lib/progressArchive";

const LAST_SYNC = "sb.lastSync.v1";

function maxNum(a, b) {
  return Math.max(Number(a) || 0, Number(b) || 0);
}

function latestListTimestamp(data) {
  const explicit = data?.[KEYS.teacherListsUpdatedAt];
  if (typeof explicit === "string" && explicit) return explicit;
  const lists = Array.isArray(data?.[KEYS.teacherLists]) ? data[KEYS.teacherLists] : [];
  return lists
    .map((list) => list?.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;
}

function mergeTeacherLists(out, local, remote) {
  const localTime = latestListTimestamp(local);
  const remoteTime = latestListTimestamp(remote);

  if (!localTime && !remoteTime) return;

  // Word lists are treated as one versioned teacher workspace. Choosing the
  // newest snapshot means deleting a list on one device does not resurrect it
  // from an older device during the next sync.
  const useLocal = Boolean(localTime && (!remoteTime || localTime >= remoteTime));
  const source = useLocal ? local : remote;
  const stamp = useLocal ? localTime : remoteTime;

  out[KEYS.teacherLists] = Array.isArray(source?.[KEYS.teacherLists])
    ? source[KEYS.teacherLists]
    : [];
  out[KEYS.teacherListsUpdatedAt] = stamp;
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
  out[KEYS.practiceDays] = mergePracticeDays(local[KEYS.practiceDays] || [], remote[KEYS.practiceDays] || [], daysFromHistory([...hist.values()]));
  out[KEYS.arcadeRecords] = mergeArcadeRecords(local[KEYS.arcadeRecords], remote[KEYS.arcadeRecords], recordsFromHistory([...hist.values()]));

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
  const remoteSettings = remote[KEYS.settings] || {};
  const localSettings = local[KEYS.settings] || {};
  const mergeItems = (a = [], b = []) => {
    const items = new Map();
    [...a, ...b].forEach(item => {
      const key = item.id || `${item.date}:${item.word}:${item.sentence}`;
      const old = items.get(key);
      if (!old || (item.updatedAt || "") >= (old.updatedAt || "")) items.set(key, item);
    });
    return [...items.values()];
  };
  const assignmentTemplates = {};
  const rt = remoteSettings.assignmentTemplates || {}, lt = localSettings.assignmentTemplates || {};
  new Set([...Object.keys(rt), ...Object.keys(lt)]).forEach(key => { assignmentTemplates[key] = mergeItems(rt[key], lt[key]); });
  out[KEYS.settings] = {
    ...remoteSettings, ...localSettings,
    personalPacks: mergeItems(remoteSettings.personalPacks, localSettings.personalPacks),
    sentenceJournal: mergeItems(remoteSettings.sentenceJournal, localSettings.sentenceJournal).slice(-100),
    questCompletions: Object.fromEntries([...Object.entries(remoteSettings.questCompletions || {}), ...Object.entries(localSettings.questCompletions || {})].filter(([, value]) => value === true)),
    assignmentTemplates,
  };
  mergeTeacherLists(out, local, remote);
  return out;
}

export function applyProgress(data) {
  Object.entries(data).forEach(([k, v]) => {
    if (Object.values(KEYS).includes(k) && k !== KEYS.theme) localStorage.setItem(k, JSON.stringify(v));
  });
  window.dispatchEvent(new CustomEvent("spellbee:word-lists-changed"));
}

export async function pullAndMerge() {
  const { data } = await api.get("/sync");
  const merged = mergeProgress(exportAll(), data?.data || null);
  applyProgress(merged);
  await push();
  return merged;
}

let pendingTimer = null;
let pendingResolvers = [];

export function push() {
  return new Promise((resolve) => {
    pendingResolvers.push(resolve);
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(async () => {
      let ok = false;
      try {
        const updated_at = new Date().toISOString();
        await api.put("/sync", { data: exportAll(), updated_at });
        localStorage.setItem(LAST_SYNC, updated_at);
        ok = true;
      } catch {
        ok = false;
      }

      const resolvers = pendingResolvers;
      pendingResolvers = [];
      pendingTimer = null;
      resolvers.forEach((done) => done(ok));
    }, 400);
  });
}

export function lastSyncedAt() {
  return localStorage.getItem(LAST_SYNC);
}
