// Curated Spelling Bee word database. The original hand-curated entries are preserved verbatim
// (see git history / scripts/out/base.json) and enriched with syllables, origin, tips, misspellings,
// categories and spelling patterns. Expanded entries are generated once and shipped statically.
import WORD_DATA from "./words.json";

export const WORDS = WORD_DATA;


export const WORDS_BY_DIFFICULTY = {
  easy: WORDS.filter((w) => w.difficulty === "easy"),
  medium: WORDS.filter((w) => w.difficulty === "medium"),
  hard: WORDS.filter((w) => w.difficulty === "hard"),
  extreme: WORDS.filter((w) => w.difficulty === "extreme"),
};

export const DIFFICULTY_META = {
  easy: { label: "Easy", subtitle: "Year 7–8", color: "emerald" },
  medium: { label: "Medium", subtitle: "Year 9–10", color: "sky" },
  hard: { label: "Hard", subtitle: "Year 11–12", color: "amber" },
  extreme: { label: "Extreme", subtitle: "National Bee", color: "rose" },
};

export const WORD_MAP = new Map(WORDS.map((w) => [w.word.toLowerCase(), w]));

export const CATEGORIES = ["Science", "Literature", "Geography", "Animals", "Technology", "Medicine", "History", "Everyday English", "Academic", "Competition"];

export const PATTERN_META = {
  "double-consonant": "Double consonants",
  "silent-letter": "Silent letters",
  "-tion/-sion": "-tion / -sion endings",
  "ie/ei": "ie vs ei",
  "-ough": "-ough words",
  "-able/-ible": "-able vs -ible",
  "-ance/-ence": "-ance vs -ence",
  "-ant/-ent": "-ant vs -ent",
  prefix: "Prefixes",
  suffix: "Suffixes",
  "greek-root": "Greek roots",
  "latin-root": "Latin roots",
  "french-origin": "French origins",
  homophone: "Homophones",
  "vowel-combination": "Vowel combinations",
  "ph/gh": "ph / gh sounds",
  "-ly/-ally": "-ly / -ally",
  "-ary/-ery/-ory": "-ary / -ery / -ory",
  "c/s confusion": "c vs s",
  "y-to-i": "y → i changes",
  "british-spelling": "British spelling",
};

// Session modes. `limit` = words per session (null = unlimited), `lives`, `timer` (seconds per word),
// `singlePlay` = word spoken once, `noHints`, `mixed` = all difficulties, `source` = special word pool.
export const MODES = [
  { id: "classic", label: "Classic", description: "Your default session length, your difficulty.", limit: "default", group: "core" },
  { id: "ten", label: "10 Words", description: "A quick 10-word round.", limit: 10, group: "core" },
  { id: "twentyfive", label: "25 Words", description: "A longer, deeper session.", limit: 25, group: "core" },
  { id: "endless", label: "Endless", description: "Keep spelling until you stop.", limit: null, group: "core" },
  { id: "challenge", label: "Challenge", description: "15 words, 15s each, mixed difficulty.", limit: 15, timer: 15, mixed: true, group: "core" },
  { id: "test", label: "Test Mode", description: "Word spoken once. No replays, no hints. Timed.", limit: 20, timer: 20, singlePlay: true, noHints: true, group: "core" },
  { id: "mistakes", label: "Mistake Mode", description: "Only the words you've missed before.", limit: 10, source: "missed", group: "learn" },
  { id: "pattern", label: "Pattern Mode", description: "Drill one spelling pattern at a time.", limit: 10, source: "pattern", group: "learn" },
  { id: "survival", label: "Survival", description: "One mistake ends the run.", limit: null, lives: 1, group: "arena" },
  { id: "speed", label: "Speed Mode", description: "10s per word. Fast answers earn bonus points.", limit: 15, timer: 10, speedBonus: true, group: "arena" },
  { id: "judge", label: "Judge Mode", description: "A real bee: ask the judge for definition, sentence, origin.", limit: 10, judge: true, group: "arena" },
];
