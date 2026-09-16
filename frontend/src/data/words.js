// Curated Spelling Bee word database. The original hand-curated entries are preserved verbatim
// (see git history / scripts/out/base.json) and enriched with syllables, origin, tips, misspellings,
// categories and spelling patterns. Expanded entries are generated once and shipped statically.
import WORD_DATA from "./words.json";
import { JUNIOR_WORDS } from "./juniorWords";

const ORIGINAL_BY_WORD = new Map(
  WORD_DATA.map((word) => [word.word.toLowerCase(), word])
);

// Junior entries win the beginner-mode classification, but keep any richer metadata that
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

export const FOUNDATION_LEVEL_IDS = ["grade4", "grade5", "grade6", "year7"];
export const ADVANCED_LEVEL_IDS = ["easy", "medium", "hard", "extreme"];
export const DIFFICULTY_LEVEL_IDS = [...FOUNDATION_LEVEL_IDS, ...ADVANCED_LEVEL_IDS];

// Compatibility aliases for existing progress, assignments and imports.
export const SCHOOL_LEVEL_IDS = FOUNDATION_LEVEL_IDS;
export const BEE_LEVEL_IDS = ADVANCED_LEVEL_IDS;
export const ALL_LEVEL_IDS = DIFFICULTY_LEVEL_IDS;

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
  grade4: { label: "Basic", shortLabel: "Basic", subtitle: "Years 4-5", recommendation: "Recommended for Years 4-5", color: "emerald", group: "foundation" },
  grade5: { label: "Very Easy", shortLabel: "V Easy", subtitle: "Years 5-6", recommendation: "Recommended for Years 5-6", color: "teal", group: "foundation" },
  grade6: { label: "Easy", shortLabel: "Easy", subtitle: "Years 6-7", recommendation: "Recommended for Years 6-7", color: "cyan", group: "foundation" },
  year7: { label: "Normal", shortLabel: "Normal", subtitle: "Years 7-8", recommendation: "Recommended for Years 7-8", color: "sky", group: "foundation" },
  easy: { label: "Medium", shortLabel: "Med", subtitle: "Years 8-9", recommendation: "Recommended for Years 8-9", color: "indigo", group: "advanced" },
  medium: { label: "Hard", shortLabel: "Hard", subtitle: "Years 9-10", recommendation: "Recommended for Years 9-10", color: "violet", group: "advanced" },
  hard: { label: "Very Hard", shortLabel: "V Hard", subtitle: "Years 10-12", recommendation: "Recommended for Years 10-12", color: "amber", group: "advanced" },
  extreme: { label: "Elite", shortLabel: "Elite", subtitle: "Extreme bee", recommendation: "Recommended for spelling bee and extension practice", color: "rose", group: "advanced" },
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
  { id: "saved", label: "Saved Words", description: "Practise the words you've bookmarked in your personal bank.", limit: 15, source: "saved", group: "learn" },
  { id: "pattern", label: "Pattern Mode", description: "Drill one spelling pattern at a time.", limit: 10, source: "pattern", group: "learn" },
  { id: "category", label: "Category Drill", description: "Focus on one topic, like Science, Literature or Geography.", limit: 12, source: "category", group: "learn" },
  { id: "origin", label: "Origin Drill", description: "Practise words from the same language family.", limit: 12, source: "origin", group: "learn" },
  { id: "confidence", label: "Confidence Builder", description: "A steadier round one level easier than your current pick.", limit: 15, source: "confidence", group: "learn" },
  { id: "survival", label: "Survival", description: "One mistake ends the run.", limit: null, lives: 1, group: "arena" },
  { id: "speed", label: "Speed Mode", description: "10s per word. Fast answers earn bonus points.", limit: 15, timer: 10, speedBonus: true, group: "arena" },
  { id: "judge", label: "Judge Mode", description: "A real bee: ask the judge for definition, sentence, origin.", limit: 10, judge: true, group: "arena" },
  { id: "dailyMix", label: "Daily Mix", description: "A balanced 12-word set that changes each day.", limit: 12, source: "daily-mix", group: "arena" },
];
