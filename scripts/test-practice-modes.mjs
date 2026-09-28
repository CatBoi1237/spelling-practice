import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Load the real browser modules without requiring the frontend build toolchain.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/src');
const values = new Map();
const context = vm.createContext({
  console, Date, Math, Set, Map, JSON, CustomEvent: class {},
  window: { dispatchEvent() {} },
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  },
});
const cache = new Map();
async function load(file) {
  if (!path.extname(file)) file += '.js';
  if (cache.has(file)) return cache.get(file);
  const source = fs.readFileSync(file, 'utf8');
  const module = file.endsWith('.json')
    ? new vm.SyntheticModule(['default'], function () { this.setExport('default', JSON.parse(source)); }, { context, identifier: file })
    : new vm.SourceTextModule(source, { context, identifier: file });
  cache.set(file, module);
  return module;
}
const session = await load(path.join(root, 'lib/session.js'));
await session.link((specifier, parent) => load(specifier.startsWith('@/')
  ? path.join(root, specifier.slice(2))
  : path.resolve(path.dirname(parent.identifier), specifier)));
await session.evaluate();
const { buildQueue, getMode } = session.namespace;
const { WORDS, WORD_MAP, TOPIC_PACKS, DIFFICULTY_LEVEL_IDS } = cache.get(path.join(root, 'data/words.js')).namespace;
const run = (mode, options = {}) => buildQueue({ mode: getMode(mode), difficulty: 'medium', ...options });
assert.equal(new Set(WORDS.map(w => w.word.toLowerCase())).size, WORDS.length, 'Word bank must be unique');
values.set('spellbee.savedWords.v1', JSON.stringify(['answer', 'busy', 'unknown-word']));
assert.deepEqual(Array.from(run('saved').queue, w => w.word).sort(), ['answer', 'busy']);
values.clear();
assert.ok(run('saved').queue.length > 0, 'Empty saved bank has a usable fallback');
for (let i = 0; i < DIFFICULTY_LEVEL_IDS.length; i++) {
  const result = run('confidence', { difficulty: DIFFICULTY_LEVEL_IDS[i] });
  assert.ok(result.queue.length > 0);
  assert.ok(result.queue.every(w => w.difficulty === DIFFICULTY_LEVEL_IDS[Math.max(0, i - 1)]));
}
assert.ok(run('confidence', { difficulty: 'mixed' }).queue.every(w => w.difficulty === 'easy'));
assert.ok(run('category', { category: 'Science' }).queue.every(w => w.category === 'Science'));
assert.ok(run('origin', { origin: 'Latin' }).queue.every(w => w.origin === 'Latin'));
for (const category of ['Business', 'invalid']) {
  const result = run('category', { category });
  assert.ok(result.queue.length > 0);
  assert.equal(new Set(result.queue.map(w => w.word)).size, result.queue.length);
}
const daily = run('dailyMix').queue.map(w => w.word);
assert.equal(daily.length, 12);
assert.equal(new Set(daily).size, 12);
assert.deepEqual(run('dailyMix').queue.map(w => w.word), daily, 'Daily selection stays stable after other practice');
assert.equal(getMode('invalid').id, 'classic', 'Invalid modes still fall back to classic practice');
assert.equal(new Set(TOPIC_PACKS.map(pack => pack.id)).size, TOPIC_PACKS.length);
for (const pack of TOPIC_PACKS) {
  const names = new Set(pack.words.map(word => word.word));
  assert.equal(names.size, 12, `${pack.title} contains twelve unique words`);
  for (const word of pack.words) {
    assert.ok(WORD_MAP.has(word.word));
    assert.ok(DIFFICULTY_LEVEL_IDS.includes(word.difficulty));
    assert.ok(word.definition && word.example && word.spellingTip);
    assert.ok(word.example.toLowerCase().includes(word.word), `${word.word} appears in its example`);
  }
  for (const difficulty of ['mixed', 'grade4', 'extreme']) {
    const queue = run('topic', { topic: pack.id, difficulty }).queue;
    assert.equal(queue.length, 12);
    assert.equal(new Set(queue.map(word => word.word)).size, 12);
    assert.ok(queue.every(word => names.has(word.word)), 'Topic practice never adds unrelated words');
  }
  const replay = run('topic', { topic: pack.id }).queue;
  assert.equal(replay.length, 12, 'An already-seen pack can be practised again');
}
assert.equal(run('topic', { topic: 'missing-pack' }).queue.length, 12);
const focusPack = TOPIC_PACKS[0];
const [masteredWord, missedWord] = focusPack.words;
const fixture = {
  [masteredWord.word]: { attempts: 5, correct: 4, incorrect: 1, streak: 3 },
  [missedWord.word]: { attempts: 2, correct: 0, incorrect: 2, streak: 0 },
  unrelated: { attempts: 1, correct: 0, incorrect: 1, streak: 0 },
};
values.set('sb.wordstats.v1', JSON.stringify(fixture));
const { topicProgress } = cache.get(path.join(root, 'lib/topicProgress.js')).namespace;
const progress = topicProgress(focusPack, fixture);
assert.equal(progress.mastered.length, 1);
assert.equal(progress.attempted.length, 2);
assert.equal(progress.unmastered.length, 11);
assert.equal(progress.missed.length, 1);
assert.deepEqual(Array.from(run('topic', { topic: focusPack.id, focus: 'missed' }).queue, w => w.word), [missedWord.word]);
const unfinished = run('topic', { topic: focusPack.id, focus: 'unmastered' }).queue;
assert.equal(unfinished.length, 11);
assert.ok(unfinished.every(w => w.word !== masteredWord.word));
assert.equal(values.get('sb.wordstats.v1'), JSON.stringify(fixture), 'Selecting practice never changes progress');
values.set('sb.wordstats.v1', JSON.stringify(Object.fromEntries(focusPack.words.map(w => [w.word, { attempts: 3, correct: 3, incorrect: 0, streak: 3 }]))));
for (const focus of ['unmastered', 'missed']) {
  const refresher = run('topic', { topic: focusPack.id, focus });
  assert.equal(refresher.queue.length, 12);
  assert.ok(refresher.notice.includes('refresher'), 'Empty focus has a clear fallback notice');
}
console.log(`Practice mode checks passed; ${WORDS.length} unique words and ${TOPIC_PACKS.length} topic packs.`);
const { parsePersonalWords, redactWord, csv, wordSearch, weekStart } = cache.get(path.join(root, 'lib/learningTools.js')).namespace;
assert.deepEqual(Array.from(parsePersonalWords('Bee, bee; rocket\nplanet')), ['bee', 'rocket', 'planet']);
assert.equal(weekStart(new Date('2026-09-20T23:59:00Z')), '2026-09-14');
assert.equal(weekStart(new Date('2026-09-21T00:00:00Z')), '2026-09-21');
assert.ok(!redactWord('The BEE is a bee.', 'bee').toLowerCase().includes('bee'));
assert.ok(csv([['=SUM(A1)', 'He said "hello"']]).includes("'=SUM(A1)"));
const search = wordSearch(TOPIC_PACKS[0].words);
for (const p of search.placements) assert.equal([...p.word].map((_, i) => search.grid[p.row + p.dr * i][p.col + p.dc * i]).join(''), p.word);
values.set('sb.settings.v1', JSON.stringify({ personalPacks: [{ id: 'test', title: 'Homework', words: ['bee', 'mynewword', 'rocket'] }] }));
const personalQueue = run('personal', { pack: 'test' }).queue;
assert.equal(personalQueue.length, 3);
assert.ok(personalQueue.some(w => w.word === 'mynewword' && w.difficulty === 'custom'));
assert.ok(run('personal', { pack: 'missing' }).notice.includes('not available'));
const weeklyA = run('weekly', { difficulty: 'grade5' }).queue.map(w => w.word);
assert.deepEqual(run('weekly', { difficulty: 'grade5' }).queue.map(w => w.word), weeklyA);
assert.equal(new Set(weeklyA).size, 10);
console.log('Learning tools, personal packs and weekly selection checks passed.');

const puzzleData = await load(path.join(root, 'data/arcadePuzzles.js'));
await puzzleData.link(() => { throw new Error('Puzzle data must be standalone'); }); await puzzleData.evaluate();
const puzzleRules = await load(path.join(root, 'lib/arcadePuzzles.js'));
await puzzleRules.link(() => { throw new Error('Puzzle rules must be standalone'); }); await puzzleRules.evaluate();
const { LADDERS, LADDER_WORDS, GRID_LETTERS, GRID_WORDS, CATEGORY_ROUNDS, RHYMES, EXTRA_GAMES } = puzzleData.namespace;
const { oneLetterApart, ladderRoute, gridPath, bingoLine, searchSelection, hangmanState } = puzzleRules.namespace;
assert.equal(new Set(EXTRA_GAMES.map(game => game.id)).size, 13);
for (const ladder of LADDERS) {
  for (let i = 1; i < ladder.length; i++) assert.ok(oneLetterApart(ladder[i - 1], ladder[i]), `${ladder[i - 1]} -> ${ladder[i]}`);
  assert.equal(ladderRoute(ladder[0], ladder.at(-1), LADDER_WORDS).at(-1), ladder.at(-1));
}
assert.equal(gridPath([...GRID_LETTERS], 'catac'), null, 'Grid paths cannot reuse tiles');
assert.equal(gridPath([...GRID_LETTERS], 'cl'), null, 'Grid paths cannot jump tiles');
const gridSolutions = GRID_WORDS.filter(word => word.length >= 3 && gridPath([...GRID_LETTERS], word));
assert.ok(gridSolutions.length >= 20);
for (const word of gridSolutions) {
  const cells = gridPath([...GRID_LETTERS], word);
  assert.equal(new Set(cells).size, word.length);
  assert.equal(cells.map(cell => GRID_LETTERS[cell]).join(''), word);
}
for (const round of CATEGORY_ROUNDS) for (const list of Object.values(round.groups)) {
  assert.ok(list.length >= 8); assert.ok(list.every(word => word.startsWith(round.letter)));
  assert.equal(new Set(list).size, list.length);
}
assert.equal(new Set(RHYMES.map(item => item.word)).size, RHYMES.length);
assert.ok(hangmanState('letter', ['l', 'e', 't', 'r']).won);
assert.equal(bingoLine([0, 1, 3]), null);
assert.ok(bingoLine([0, 4, 8]));
for (const level of DIFFICULTY_LEVEL_IDS) {
  const eligible = WORDS.filter(word => word.difficulty === level && /^[a-z]+$/.test(word.word));
  assert.ok(eligible.length >= 9, `Bingo needs nine words for ${level}`);
  const puzzle = wordSearch(eligible.filter(word => word.word.length <= 10).slice(0, 6), 10);
  assert.ok(puzzle.placements.length >= 3, `Word search needs usable words for ${level}`);
  for (const p of puzzle.placements) {
    const start = p.row * 10 + p.col, end = (p.row + p.dr * (p.word.length - 1)) * 10 + p.col + p.dc * (p.word.length - 1);
    assert.equal(searchSelection(puzzle.placements, end, start, 10).word, p.word);
  }
}
console.log(`Arcade puzzle checks passed; ${gridSolutions.length} connected grid words and ${LADDERS.length} solvable ladders.`);

const letterData = await load(path.join(root, 'data/letterPuzzles.js'));
await letterData.link(() => { throw new Error('Letter data must be standalone'); }); await letterData.evaluate();
const letterRules = await load(path.join(root, 'lib/letterPuzzles.js'));
await letterRules.link(() => { throw new Error('Letter rules must be standalone'); }); await letterRules.evaluate();
const { CODE_WORDS, CODE_GUESSES, HIVES } = letterData.namespace;
const { codeFeedback, checkHiveWord, hivePoints } = letterRules.namespace;
assert.equal(CODE_WORDS.length, 20);
for (const item of CODE_WORDS) {
  assert.ok(CODE_GUESSES.includes(item.word)); assert.ok(item.clue);
  for (const guess of CODE_GUESSES) {
    assert.match(guess, /^[a-z]{5}$/);
    const feedback = codeFeedback(item.word, guess);
    for (const letter of new Set(guess)) assert.ok([...guess].filter((char, i) => char === letter && feedback[i] !== 'absent').length <= [...item.word].filter(char => char === letter).length);
  }
}
for (const hive of HIVES) {
  assert.equal(new Set(hive.letters).size, 7); assert.ok(hive.letters.includes(hive.centre));
  assert.equal(new Set(hive.words.map(item => item.word)).size, hive.words.length);
  assert.ok(hive.words.some(item => hive.letters.every(letter => item.word.includes(letter))));
  for (const item of hive.words) { assert.equal(checkHiveWord(item.word, hive, []), null); assert.ok(item.clue); }
}
assert.equal(hivePoints('planets', HIVES[0].letters), 14);
console.log(`Letter puzzles passed: ${CODE_WORDS.length} codes, ${HIVES.length} hives, ${HIVES.reduce((sum, hive) => sum + hive.words.length, 0)} word clues.`);
