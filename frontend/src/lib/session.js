// Builds a practice queue for a mode, avoiding recently seen words.
import { WORDS, WORDS_BY_DIFFICULTY, WORD_MAP, MODES } from "@/data/words";
import { getMissed, getSeen, markSeen } from "@/lib/storage";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getMode(id) {
  return MODES.find((m) => m.id === id) || MODES[0];
}

export function resolveMode(mode, settings, params) {
  const m = { ...mode };
  if (m.limit === "default") m.limit = Number(settings.defaultLength) || 10;
  if (m.id === "test") {
    m.limit = Number(params.get("count")) || Number(settings.testWordCount) || 20;
    m.timer = Number(params.get("seconds")) || Number(settings.testModeSeconds) || 20;
    m.showDefinition = params.get("def") === "1" || settings.testShowDefinition;
  }
  if (params.get("judge") === "1") m.judge = true;
  return m;
}

// Returns { queue, source } — source describes where the words came from (for UI notices).
export function buildQueue({ mode, difficulty, pattern, word }) {
  let pool;
  let notice = null;

  if (word && WORD_MAP.get(word.toLowerCase())) {
    return { queue: [WORD_MAP.get(word.toLowerCase())], notice };
  }

  if (mode.source === "missed") {
    const missed = getMissed()
      .map((m) => WORD_MAP.get(m.word.toLowerCase()))
      .filter(Boolean);
    if (missed.length === 0) {
      notice = "No missed words yet — here's a normal session instead.";
      pool = WORDS_BY_DIFFICULTY[difficulty] || WORDS_BY_DIFFICULTY.medium;
    } else {
      // prioritised order already; take the top slice and lightly shuffle within it
      const limit = mode.limit || missed.length;
      return { queue: shuffle(missed.slice(0, Math.max(limit, Math.min(missed.length, limit)))), notice };
    }
  } else if (mode.source === "pattern" && pattern) {
    pool = WORDS.filter((w) => (w.patterns || []).includes(pattern));
    if (pool.length < 3) {
      notice = "Not enough words for that pattern yet — mixing in your difficulty.";
      pool = [...pool, ...(WORDS_BY_DIFFICULTY[difficulty] || [])];
    }
  } else if (mode.mixed || difficulty === "mixed") {
    pool = WORDS;
  } else if (difficulty === "adaptive") {
    pool = WORDS;
  } else {
    pool = WORDS_BY_DIFFICULTY[difficulty] || WORDS_BY_DIFFICULTY.medium;
  }

  const seen = new Set(getSeen());
  let fresh = pool.filter((w) => !seen.has(w.word));
  const limit = mode.limit || pool.length;
  // pool exhausted → allow repeats of the oldest-seen words
  if (fresh.length < Math.min(limit, pool.length)) fresh = pool;
  const queue = shuffle(fresh).slice(0, limit);
  markSeen(queue.map((w) => w.word));
  return { queue, notice };
}

export const BASE_POINTS = 100;

export function scoreAnswer({ isRight, elapsedSec, hintsUsed, streak, mode }) {
  if (!isRight) return 0;
  let pts = BASE_POINTS - Math.min(60, hintsUsed * 20);
  pts += Math.min(streak, 5) * 10;
  if (mode.speedBonus || mode.timer) pts += Math.max(0, 50 - Math.floor(elapsedSec * 5));
  else if (elapsedSec < 4) pts += 15;
  return pts;
}
