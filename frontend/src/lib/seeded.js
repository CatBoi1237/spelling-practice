// Deterministic word selection: every client with the same seed gets the same words.
import { WORDS, WORDS_BY_DIFFICULTY } from "@/data/words";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickSeededWords(seed, count, difficulty = "mixed") {
  const pool = difficulty === "mixed" ? WORDS : WORDS_BY_DIFFICULTY[difficulty] || WORDS;
  const sorted = [...pool].sort((a, b) => a.word.localeCompare(b.word));
  const rand = mulberry32(seed);
  const arr = [...sorted];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

// Daily set: a spread of difficulties so every day feels like a real challenge.
export function pickDailyWords(seed, count = 5) {
  const ladder = ["easy", "easy", "medium", "hard", "extreme"];
  const rand = mulberry32(seed);
  const out = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    const diff = ladder[i % ladder.length];
    const pool = [...(WORDS_BY_DIFFICULTY[diff] || WORDS)].sort((a, b) => a.word.localeCompare(b.word));
    let pick;
    let guard = 0;
    do {
      pick = pool[Math.floor(rand() * pool.length)];
      guard += 1;
    } while (pick && used.has(pick.word) && guard < 50);
    if (pick) {
      used.add(pick.word);
      out.push(pick);
    }
  }
  return out;
}
