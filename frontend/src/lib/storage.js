// localStorage-backed persistence for progress + settings.

export const KEYS = {
  settings: "sb.settings.v1",
  stats: "sb.stats.v1",
  history: "sb.history.v1",
  missed: "sb.missed.v1",
  theme: "sb.theme.v1",
  wordStats: "sb.wordstats.v1",
  seen: "sb.seen.v1",
  achievements: "sb.achievements.v1",
  daily: "sb.daily.v1",
};

export const DEFAULT_SETTINGS = {
  rate: "normal", // verySlow | slow | normal | fast
  voiceName: null,
  voiceLang: "auto", // auto | en-AU | en-GB | en-US
  soundEffects: true,
  autoPlay: true,
  autoAdvance: true,
  preferredDifficulty: "medium",
  defaultLength: 10,
  showDefinitions: true,
  showTips: true,
  testModeSeconds: 20,
  testWordCount: 20,
  testShowDefinition: false,
  judgeMode: false,
};

export const DEFAULT_STATS = {
  totalAttempted: 0,
  totalCorrect: 0,
  totalIncorrect: 0,
  bestStreak: 0,
  currentStreak: 0,
  highestDifficulty: null,
  wordsCompleted: 0,
  totalPoints: 0,
  totalTimeMs: 0,
  hintsUsed: 0,
  sessions: 0,
  fastestAnswerMs: null,
  perfectSessions: 0,
  extremeSessions: 0,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function readRaw(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function getSettings() {
  return read(KEYS.settings, DEFAULT_SETTINGS);
}
export function saveSettings(s) {
  write(KEYS.settings, s);
}

export function getStats() {
  return read(KEYS.stats, DEFAULT_STATS);
}
export function saveStats(s) {
  write(KEYS.stats, s);
}

export function getHistory() {
  return readRaw(KEYS.history, []);
}
export function appendHistory(session) {
  const list = getHistory();
  list.unshift(session);
  write(KEYS.history, list.slice(0, 100));
}

// ---------- per-word statistics (mistake learning system) ----------
export function getWordStats() {
  const stats = readRaw(KEYS.wordStats, null);
  if (stats) return stats;
  // migrate legacy missed list
  const legacy = readRaw(KEYS.missed, []);
  const migrated = {};
  legacy.forEach((m) => {
    migrated[m.word] = {
      attempts: m.count,
      correct: 0,
      incorrect: m.count,
      streak: 0,
      bestStreak: 0,
      lastAttempted: m.lastMissed || new Date().toISOString(),
    };
  });
  write(KEYS.wordStats, migrated);
  return migrated;
}

export function recordWordAttempt(word, isRight) {
  const all = getWordStats();
  const cur = all[word] || { attempts: 0, correct: 0, incorrect: 0, streak: 0, bestStreak: 0, lastAttempted: null };
  cur.attempts += 1;
  if (isRight) {
    cur.correct += 1;
    cur.streak += 1;
    cur.bestStreak = Math.max(cur.bestStreak, cur.streak);
  } else {
    cur.incorrect += 1;
    cur.streak = 0;
  }
  cur.lastAttempted = new Date().toISOString();
  all[word] = cur;
  write(KEYS.wordStats, all);
  return cur;
}

export const MASTERY_STREAK = 3;

export function isMastered(ws) {
  return !!ws && ws.streak >= MASTERY_STREAK;
}

export function priorityScore(ws) {
  // higher = needs more work
  const acc = ws.attempts ? ws.correct / ws.attempts : 0;
  return ws.incorrect * 2 + (1 - acc) * 3 - ws.streak;
}

// words the user still needs to master, most-urgent first
export function getMissed() {
  const all = getWordStats();
  return Object.entries(all)
    .filter(([, ws]) => ws.incorrect > 0 && !isMastered(ws))
    .map(([word, ws]) => ({ word, ...ws, count: ws.incorrect, accuracy: ws.attempts ? Math.round((ws.correct / ws.attempts) * 100) : 0 }))
    .sort((a, b) => priorityScore(b) - priorityScore(a));
}

export function countMastered() {
  return Object.values(getWordStats()).filter((ws) => ws.correct > 0 && isMastered(ws)).length;
}

// ---------- recently seen (avoid repeats) ----------
export function getSeen() {
  return readRaw(KEYS.seen, []);
}
export function markSeen(words) {
  const seen = getSeen().filter((w) => !words.includes(w));
  write(KEYS.seen, [...words, ...seen].slice(0, 400));
}

// ---------- achievements ----------
export function getUnlocked() {
  return readRaw(KEYS.achievements, {});
}
export function saveUnlocked(map) {
  write(KEYS.achievements, map);
}

// ---------- daily ----------
export function getDailyLocal() {
  return readRaw(KEYS.daily, { completed: [], streak: 0 });
}
export function saveDailyLocal(d) {
  write(KEYS.daily, d);
}

export function exportAll() {
  const out = {};
  Object.values(KEYS).forEach((k) => {
    const v = localStorage.getItem(k);
    if (v) out[k] = JSON.parse(v);
  });
  return out;
}

export function resetAll() {
  Object.values(KEYS).forEach((k) => {
    if (k !== KEYS.theme) localStorage.removeItem(k);
  });
}

export function getTheme() {
  try {
    return localStorage.getItem(KEYS.theme) || "system";
  } catch {
    return "system";
  }
}
export function saveTheme(theme) {
  try {
    localStorage.setItem(KEYS.theme, theme);
  } catch {
    /* ignore */
  }
}
