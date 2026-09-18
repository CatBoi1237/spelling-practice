import { mergeProgress } from "./sync";
import { KEYS } from "./storage";
import { importPersonalPack, validatePersonalPack, wordSearch, completedQuestRound, sessionsCsv, sentencesCsv } from "./learningTools";
import { scrambleWord, missingLetters, sampleRound } from "./arcadeChallenges";
import { WORD_PAIRS, WORD_PARTS } from "@/data/wordGames";
jest.mock("@/lib/api", () => ({ api: {} }));

test("sync preserves independent packs and sentences and honours template deletion", () => {
  const remote = { [KEYS.settings]: {
    personalPacks: [{ id: 'remote', title: 'Cloud pack', words: ['bee'] }],
    sentenceJournal: [{ date: '2026-09-17', word: 'bee', sentence: 'A bee visited the garden.' }],
    assignmentTemplates: { teacher: [{ id: 'template', title: 'Old', updatedAt: '2026-09-16' }] },
  } };
  const local = { [KEYS.settings]: {
    personalPacks: [{ id: 'local', title: 'Device pack', words: ['planet'] }],
    sentenceJournal: [{ date: '2026-09-17', word: 'planet', sentence: 'Our planet has one moon.' }],
    assignmentTemplates: { teacher: [{ id: 'template', deleted: true, updatedAt: '2026-09-17' }] },
  } };
  const merged = mergeProgress(local, remote)[KEYS.settings];
  expect(merged.personalPacks.map(p => p.id).sort()).toEqual(['local', 'remote']);
  expect(merged.sentenceJournal).toHaveLength(2);
  expect(merged.assignmentTemplates.teacher).toHaveLength(1);
  expect(merged.assignmentTemplates.teacher[0].deleted).toBe(true);
  expect(mergeProgress(remote, local)[KEYS.settings].assignmentTemplates.teacher[0].deleted).toBe(true);
});

test("pack import validates its format and creates only editable word data", () => {
  const data = importPersonalPack(JSON.stringify({ format: 'spellbee-pack', version: 1, id: 'foreign-id', title: ' Space ', words: ['planet', 'rocket', 'moon'] }));
  expect(data).toEqual({ title: 'Space', words: ['planet', 'rocket', 'moon'] });
  expect(() => importPersonalPack('{')).toThrow();
  expect(() => importPersonalPack(JSON.stringify({ format: 'spellbee-pack', version: 1, title: 'Bad', words: ['valid', {}, 'moon'] }))).toThrow();
  expect(() => validatePersonalPack('Too many', Array.from({ length: 51 }, (_, i) => `word${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + i % 26)}`).join(' '))).toThrow('50');
});

test("puzzle answers match all placements, including non-horizontal words", () => {
  const words = ['planet', 'rocket', 'garden', 'flower', 'school', 'cloud', 'bee'].map(word => ({ word }));
  const puzzle = wordSearch(words);
  expect(puzzle.placements).toHaveLength(words.length);
  expect(puzzle.placements.some(p => p.dr !== 0)).toBe(true);
  for (const p of puzzle.placements) expect([...p.word].map((_, i) => puzzle.grid[p.row + p.dr * i][p.col + p.dc * i]).join('')).toBe(p.word);
  expect(wordSearch(words)).toEqual(puzzle);
  expect(wordSearch([{ word: 'unplaceablylongword' }], 3).placements).toHaveLength(0);
});

test("game clues preserve letters and hide some spelling", () => {
  for (const word of ['planet', 'bee', 'letter', 'a-b', 'book']) {
    expect([...scrambleWord(word)].sort()).toEqual([...word].sort());
    expect(scrambleWord(word)).not.toBe(word);
  }
  expect(missingLetters('planet')).toBe('p _ a _ e _');
});

test("quests only count full topic rounds and sync retains all earned completions", () => {
  const round = { mode: 'topic', topic: 'garden', total: 12, queueLength: 12 };
  expect(completedQuestRound(round)).toBe(true);
  expect(completedQuestRound({ ...round, total: 3 })).toBe(false);
  expect(completedQuestRound({ ...round, focus: 'missed' })).toBe(false);
  expect(completedQuestRound({ ...round, mode: 'classic' })).toBe(false);
  const local = { [KEYS.settings]: { questCompletions: { garden: true } } };
  const remote = { [KEYS.settings]: { questCompletions: { space: true, garden: false } } };
  expect(mergeProgress(local, remote)[KEYS.settings].questCompletions).toEqual({ garden: true, space: true });
  expect(mergeProgress(remote, local)[KEYS.settings].questCompletions).toEqual({ garden: true, space: true });
});

test('progress exports include meaningful totals and quote spreadsheet formulas safely', () => {
  const sessions = sessionsCsv([{ date: '2026-09-18', mode: 'arcade-memory', difficulty: 'grade5', correct: 3, incorrect: 1, points: 300, avgTime: 2.125 }]);
  expect(sessions).toContain('"75"'); expect(sessions).toContain('"2.13"');
  const sentences = sentencesCsv([{ date: '2026-09-18', word: 'bee', sentence: '=HYPERLINK("bad")' }]);
  expect(sentences).toContain("'=HYPERLINK");
  expect(sentences).toContain('""bad""');
});

test('expanded exercises have clear prompts, unique choices and valid answers', () => {
  expect(WORD_PAIRS).toHaveLength(24);
  expect(WORD_PARTS).toHaveLength(24);
  expect(new Set(WORD_PAIRS.map(item => item.sentence)).size).toBe(24);
  expect(new Set(WORD_PARTS.map(item => item.answer)).size).toBe(24);
  for (const item of WORD_PAIRS) {
    expect(item.sentence).toContain('_____');
    expect(item.options).toContain(item.answer);
    expect(new Set(item.options).size).toBe(item.options.length);
    expect(item.tip.length).toBeGreaterThan(20);
  }
  for (const item of WORD_PARTS) {
    expect(['prefix', 'suffix']).toContain(item.position);
    expect(item.base && item.part && item.answer && item.tip).toBeTruthy();
    if (item.position === 'prefix') expect(item.answer).toBe(item.part + item.base);
  }
});

test('round sampling varies question order without mutating the exercise bank', () => {
  const before = JSON.stringify(WORD_PAIRS);
  const first = sampleRound(WORD_PAIRS, 10, () => 0.999);
  const next = sampleRound(WORD_PAIRS, 10, () => 0);
  expect(first).toHaveLength(10);
  expect(new Set(first).size).toBe(10);
  expect(next).not.toEqual(first);
  expect(JSON.stringify(WORD_PAIRS)).toBe(before);
  expect(sampleRound([], 10)).toEqual([]);
  expect(sampleRound([1, 2], 10)).toHaveLength(2);
});
