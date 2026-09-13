// Deterministic word selection: every client with the same seed gets the same words.
import { WORDS, WORDS_BY_DIFFICULTY } from "@/data/words";
import { getActiveGameCustomList } from "@/lib/customWordLists";

const WORD_LOOKUP = new Map(
  WORDS.map((item) => [String(item.word || "").toLocaleLowerCase(), item])
);

function customWordObjects(customList) {
  if (!customList?.words?.length) return [];

  return customList.words.map((word) => {
    const known = WORD_LOOKUP.get(String(word).toLocaleLowerCase());

    if (known) {
      return {
        ...known,
        word,
      };
    }

    return {
      word,
      difficulty: "custom",
      definition: "",
      example: "",
      origin: "",
      originNote: "",
    };
  });
}

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
  // Race and Classroom pages may have a teacher-selected custom list attached
  // to the current room. Keeping this lookup here means every existing caller
  // (Race, Classroom host controls, results reporting) stays in sync.
  const custom = getActiveGameCustomList();
  if (custom?.words?.length) {
    return customWordObjects(custom).slice(0, count);
  }

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
