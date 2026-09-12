// localStorage-backed persistence for progress + settings.

const KEYS = {
  settings: "sb.settings.v1",
  stats: "sb.stats.v1",
  history: "sb.history.v1",
  missed: "sb.missed.v1",
  theme: "sb.theme.v1",
};

const DEFAULT_SETTINGS = {
  rate: "normal", // slow | normal | fast
  voiceName: null,
  soundEffects: true,
  autoPlay: true,
  autoAdvance: true,
  preferredDifficulty: "medium",
  testModeSeconds: 20,
};

const DEFAULT_STATS = {
  totalAttempted: 0,
  totalCorrect: 0,
  totalIncorrect: 0,
  bestStreak: 0,
  currentStreak: 0,
  highestDifficulty: null,
  wordsCompleted: 0,
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
  try {
    return JSON.parse(localStorage.getItem(KEYS.history) || "[]");
  } catch {
    return [];
  }
}
export function appendHistory(session) {
  const list = getHistory();
  list.unshift(session);
  const trimmed = list.slice(0, 50);
  write(KEYS.history, trimmed);
}

export function getMissed() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.missed) || "[]");
  } catch {
    return [];
  }
}
export function addMissedWords(words) {
  const list = getMissed();
  const map = new Map(list.map((m) => [m.word, m]));
  words.forEach((w) => {
    const existing = map.get(w.word);
    if (existing) {
      existing.count += 1;
      existing.lastMissed = new Date().toISOString();
    } else {
      map.set(w.word, { ...w, count: 1, lastMissed: new Date().toISOString() });
    }
  });
  write(KEYS.missed, Array.from(map.values()));
}
export function removeMissedWord(word) {
  const list = getMissed().filter((m) => m.word !== word);
  write(KEYS.missed, list);
}

export function resetAll() {
  Object.values(KEYS).forEach((k) => {
    if (k !== KEYS.theme) localStorage.removeItem(k);
  });
}

export function getTheme() {
  try {
    return localStorage.getItem(KEYS.theme) || "dark";
  } catch {
    return "dark";
  }
}
export function saveTheme(theme) {
  try {
    localStorage.setItem(KEYS.theme, theme);
  } catch {
    /* ignore */
  }
}
