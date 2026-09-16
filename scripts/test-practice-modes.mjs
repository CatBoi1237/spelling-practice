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
  await module.link((specifier, parent) => load(specifier.startsWith('@/')
    ? path.join(root, specifier.slice(2))
    : path.resolve(path.dirname(parent.identifier), specifier)));
  return module;
}
const session = await load(path.join(root, 'lib/session.js'));
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
console.log(`Practice mode checks passed; ${WORDS.length} unique words and ${TOPIC_PACKS.length} topic packs.`);
