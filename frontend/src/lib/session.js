// Builds a practice queue for a mode, avoiding recently seen words.
import { WORDS, WORDS_BY_DIFFICULTY, WORD_MAP, MODES } from "@/data/words";
import { pickDailyWords } from "@/lib/seeded";
import { getMissed, getSeen, markSeen } from "@/lib/storage";
import { getSavedWords } from "@/lib/savedWords";

const LEVEL_ORDER = ["grade4", "grade5", "grade6", "year7", "easy", "medium", "hard", "extreme"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function addUnique(target, source, amount, used) {
  if (amount <= 0) return;
  for (const word of shuffle(source)) {
    const key = word?.word?.toLowerCase();
    if (!key || used.has(key)) continue;
    used.add(key);
    target.push(word);
    if (target.length >= amount) break;
  }
}

function smartQueue(difficulty, limit) {
  const seen = new Set(getSeen());
  const missedRows = getMissed();
  const missedWords = missedRows
    .map((row) => WORD_MAP.get(row.word.toLowerCase()))
    .filter(Boolean);

  const patternCounts = {};
  missedWords.forEach((word) => {
    (word.patterns || []).forEach((pattern) => {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    });
  });
  const weakPatterns = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([pattern]) => pattern);

  const patternWords = weakPatterns.length
    ? WORDS.filter((word) => (word.patterns || []).some((pattern) => weakPatterns.includes(pattern)))
    : [];

  const levelPool = WORDS_BY_DIFFICULTY[difficulty] || WORDS;
  const currentIndex = LEVEL_ORDER.indexOf(difficulty);
  const challengeId = currentIndex >= 0 && currentIndex < LEVEL_ORDER.length - 1
    ? LEVEL_ORDER[currentIndex + 1]
    : difficulty;
  const challengePool = WORDS_BY_DIFFICULTY[challengeId] || levelPool;

  // Prefer fresh words outside the explicit mistake bucket. Mistakes are intentionally
  // allowed to repeat because Smart Practice exists to reinforce them.
  const freshLevel = levelPool.filter((word) => !seen.has(word.word));
  const freshPatterns = patternWords.filter((word) => !seen.has(word.word));
  const freshChallenge = challengePool.filter((word) => !seen.has(word.word));

  const queue = [];
  const used = new Set();
  const mistakeTarget = Math.round(limit * 0.5);
  const levelTarget = mistakeTarget + Math.round(limit * 0.25);
  const patternTarget = levelTarget + Math.round(limit * 0.15);

  addUnique(queue, missedWords, mistakeTarget, used);
  addUnique(queue, freshLevel.length ? freshLevel : levelPool, levelTarget, used);
  addUnique(queue, freshPatterns.length ? freshPatterns : patternWords, patternTarget, used);
  addUnique(queue, freshChallenge.length ? freshChallenge : challengePool, limit, used);

  if (queue.length < limit) {
    const fallbackFresh = WORDS.filter((word) => !seen.has(word.word));
    addUnique(queue, fallbackFresh.length ? fallbackFresh : WORDS, limit, used);
  }

  const finalQueue = shuffle(queue).slice(0, limit);
  markSeen(finalQueue.map((word) => word.word));
  return {
    queue: finalQueue,
    notice: missedWords.length
      ? `Smart Practice mixed ${Math.min(missedWords.length, mistakeTarget)} priority mistake word${Math.min(missedWords.length, mistakeTarget) === 1 ? "" : "s"} with level, pattern and challenge practice.`
      : "Smart Practice will personalise more strongly as it learns from your mistakes. For now, it is mixing your level with challenge words.",
  };
}

function wordsFromNames(names) {
  return names
    .map((name) => WORD_MAP.get(String(name).toLowerCase()))
    .filter(Boolean);
}

function todaySeed() {
  return Number(new Date().toISOString().slice(0, 10).replaceAll("-", ""));
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
export function buildQueue({ mode, difficulty, pattern, category, origin, word }) {
  let pool;
  let notice = null;

  if (word && WORD_MAP.get(word.toLowerCase())) {
    return { queue: [WORD_MAP.get(word.toLowerCase())], notice };
  }

  if (mode.source === "smart") {
    return smartQueue(difficulty, mode.limit || 15);
  }

  if (mode.source === "saved") {
    const saved = wordsFromNames(getSavedWords());
    if (saved.length === 0) {
      notice = "No saved words yet - here's a normal session instead.";
      pool = WORDS_BY_DIFFICULTY[difficulty] || WORDS_BY_DIFFICULTY.medium;
    } else {
      const limit = Math.min(mode.limit || saved.length, saved.length);
      return { queue: shuffle(saved).slice(0, limit), notice };
    }
  } else if (mode.source === "confidence") {
    const currentIndex = LEVEL_ORDER.indexOf(difficulty === "mixed" ? "medium" : difficulty);
    const easierId = currentIndex > 0 ? LEVEL_ORDER[currentIndex - 1] : difficulty;
    pool = WORDS_BY_DIFFICULTY[easierId] || WORDS_BY_DIFFICULTY[difficulty] || WORDS_BY_DIFFICULTY.medium;
    notice = `Confidence Builder uses ${difficulty === easierId ? "your current level" : "one easier level"} so you can rebuild rhythm.`;
  } else if (mode.source === "daily-mix") {
    const queue = pickDailyWords(todaySeed(), mode.limit || 12);
    return { queue, notice: "Daily Mix uses the same balanced set for everyone today." };
  } else if (mode.source === "category" && category) {
    pool = WORDS.filter((w) => w.category === category);
    if (pool.length < 5) {
      notice = "That category is still small - mixing in your difficulty too.";
      pool = [...pool, ...(WORDS_BY_DIFFICULTY[difficulty] || [])];
    }
  } else if (mode.source === "origin" && origin) {
    pool = WORDS.filter((w) => w.origin === origin);
    if (pool.length < 5) {
      notice = "That origin group is still small - mixing in your difficulty too.";
      pool = [...pool, ...(WORDS_BY_DIFFICULTY[difficulty] || [])];
    }
  } else if (mode.source === "missed") {
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
  pool = [...new Map(pool.map((item) => [item.word.toLowerCase(), item])).values()];
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
