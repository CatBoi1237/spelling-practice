// Curated Spelling Bee word database. The original hand-curated entries are preserved verbatim
// (see git history / scripts/out/base.json) and enriched with syllables, origin, tips, misspellings,
// categories and spelling patterns. Expanded entries are generated once and shipped statically.
import WORD_DATA from "./words.json";
import { JUNIOR_WORDS } from "./juniorWords";

const ORIGINAL_BY_WORD = new Map(
  WORD_DATA.map((word) => [word.word.toLowerCase(), word])
);

// Junior entries win the school-level classification, but keep any richer metadata that
// already exists in the original bee database. Everything is de-duplicated by spelling.
const juniorKeys = new Set(JUNIOR_WORDS.map((word) => word.word.toLowerCase()));
const enrichedJunior = JUNIOR_WORDS.map((word) => ({
  ...(ORIGINAL_BY_WORD.get(word.word.toLowerCase()) || {}),
  ...word,
}));

export const WORDS = [
  ...enrichedJunior,
  ...WORD_DATA.filter((word) => !juniorKeys.has(word.word.toLowerCase())),
];

export const SCHOOL_LEVEL_IDS = ["grade4", "grade5", "grade6", "year7"];
export const BEE_LEVEL_IDS = ["easy", "medium", "hard", "extreme"];
export const ALL_LEVEL_IDS = [...SCHOOL_LEVEL_IDS, ...BEE_LEVEL_IDS];

export const WORDS_BY_DIFFICULTY = {
  grade4: WORDS.filter((w) => w.difficulty === "grade4"),
  grade5: WORDS.filter((w) => w.difficulty === "grade5"),
  grade6: WORDS.filter((w) => w.difficulty === "grade6"),
  year7: WORDS.filter((w) => w.difficulty === "year7"),
  easy: WORDS.filter((w) => w.difficulty === "easy"),
  medium: WORDS.filter((w) => w.difficulty === "medium"),
  hard: WORDS.filter((w) => w.difficulty === "hard"),
  extreme: WORDS.filter((w) => w.difficulty === "extreme"),
};

export const DIFFICULTY_META = {
  grade4: { label: "Grade 4", subtitle: "Foundation", color: "emerald", group: "school" },
  grade5: { label: "Grade 5", subtitle: "Building", color: "teal", group: "school" },
  grade6: { label: "Grade 6", subtitle: "Growing", color: "cyan", group: "school" },
  year7: { label: "Year 7", subtitle: "Secondary", color: "sky", group: "school" },
  easy: { label: "Easy Bee", subtitle: "Year 7–8+", color: "indigo", group: "bee" },
  medium: { label: "Medium", subtitle: "Year 9–10", color: "violet", group: "bee" },
  hard: { label: "Hard", subtitle: "Year 11–12", color: "amber", group: "bee" },
  extreme: { label: "Extreme", subtitle: "National Bee", color: "rose", group: "bee" },
};

export const WORD_MAP = new Map(WORDS.map((w) => [w.word.toLowerCase(), w]));

export const CATEGORIES = ["Science", "Literature", "Geography", "Animals", "Technology", "Medicine", "History", "Everyday English", "Academic", "Competition", "Civics"];

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
  { id: "smart", label: "Smart Practice", description: "A personalised mix of mistakes, weak patterns, your level and challenge words.", limit: 15, source: "smart", group: "learn" },
  { id: "mistakes", label: "Mistake Mode", description: "Only the words you've missed before.", limit: 10, source: "missed", group: "learn" },
  { id: "pattern", label: "Pattern Mode", description: "Drill one spelling pattern at a time.", limit: 10, source: "pattern", group: "learn" },
  { id: "survival", label: "Survival", description: "One mistake ends the run.", limit: null, lives: 1, group: "arena" },
  { id: "speed", label: "Speed Mode", description: "10s per word. Fast answers earn bonus points.", limit: 15, timer: 10, speedBonus: true, group: "arena" },
  { id: "judge", label: "Judge Mode", description: "A real bee: ask the judge for definition, sentence, origin.", limit: 10, judge: true, group: "arena" },
];
