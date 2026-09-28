import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Arcade from './Arcade';
import { getHistory, getWordStats } from '@/lib/storage';
import { bingoLine, gridPath, hangmanState, ladderRoute, oneLetterApart, searchSelection } from '@/lib/arcadePuzzles';
import { CATEGORY_ROUNDS, GRID_LETTERS, GRID_WORDS, LADDERS, LADDER_WORDS, RHYMES } from '@/data/arcadePuzzles';
import { wordSearch } from '@/lib/learningTools';
import { WORDS_BY_DIFFICULTY } from '@/data/words';
import { CODE_WORDS, CODE_GUESSES, HIVES } from '@/data/letterPuzzles';
import { codeFeedback, hivePoints, checkHiveWord } from '@/lib/letterPuzzles';

global.IS_REACT_ACT_ENVIRONMENT = true;
let mockSearch = '';
const mockUpdateStats = jest.fn(), mockRefresh = jest.fn();
jest.mock('react-router-dom', () => ({ useSearchParams: () => [new URLSearchParams(mockSearch)], Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('@/context/AppContext', () => ({ useApp: () => ({ settings: { autoPlay: false }, updateStats: mockUpdateStats, refresh: mockRefresh }) }));
jest.mock('@/lib/speech', () => ({ speak: jest.fn(), cancelSpeech: jest.fn(), isSpeechSupported: () => true }));
jest.mock('@/data/words', () => ({ WORDS_BY_DIFFICULTY: { grade5: ['planet', 'bridge', 'castle', 'garden', 'winter', 'summer', 'pencil', 'rabbit', 'yellow', 'window', 'silver', 'forest'].map(word => ({ word, definition: `A clue for _____ (${word.length} letters).`, spellingTip: 'Check each letter.' })) }, DIFFICULTY_META: { grade5: { label: 'Very Easy' } }, WORD_MAP: new Map() }));

let host, root;
beforeEach(() => {
  jest.clearAllMocks(); jest.spyOn(Math, 'random').mockReturnValue(0.999); localStorage.clear();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); jest.restoreAllMocks(); jest.useRealTimers(); });
function render(game) { mockSearch = `game=${game}&level=grade5`; act(() => root.render(<Arcade />)); }
function button(label) { const found = [...host.querySelectorAll('button')].find(node => node.textContent === label); if (!found) throw new Error(`Missing button: ${label}`); return found; }
function click(label) { act(() => button(label).click()); }
function fill(node, value) { act(() => { Object.getOwnPropertyDescriptor(node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); }); }
function answer(value) { fill(host.querySelector('input:not([disabled])'), value); submit(); }
function submit() { act(() => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }

test('all curated ladders have valid paths and disconnected routes return null', () => {
  for (const puzzle of LADDERS) {
    puzzle.slice(1).forEach((word, i) => expect(oneLetterApart(puzzle[i], word)).toBe(true));
    expect(ladderRoute(puzzle[0], puzzle.at(-1), LADDER_WORDS).at(-1)).toBe(puzzle.at(-1));
  }
  expect(oneLetterApart('cat', 'cat')).toBe(false); expect(oneLetterApart('cat', 'coat')).toBe(false);
  expect(ladderRoute('cat', 'dog', ['cat', 'dog'])).toBeNull();
});
test('grid search rejects reused and non-adjacent tiles', () => {
  expect(gridPath([...GRID_LETTERS], 'cat')).toEqual([0, 1, 2]);
  expect(gridPath([...GRID_LETTERS], 'catac')).toBeNull();
  expect(gridPath([...GRID_LETTERS], 'cl')).toBeNull();
  expect(GRID_WORDS.filter(word => word.length >= 3 && gridPath([...GRID_LETTERS], word)).length).toBeGreaterThan(20);
});
test('bingo recognises rows, columns and diagonals only', () => {
  for (const marked of [[0, 1, 2], [0, 3, 6], [0, 4, 8], [2, 4, 6]]) expect(bingoLine(marked)).not.toBeNull();
  expect(bingoLine([0, 1, 3])).toBeNull(); expect(bingoLine([0, 0, 0])).toBeNull();
});
test('hangman needs all distinct letters and stops at six misses', () => {
  expect(hangmanState('letter', ['l', 'e', 't', 'r']).won).toBe(true);
  expect(hangmanState('letter', ['a', 'b', 'c', 'd', 'f', 'g']).over).toBe(true);
});
test('hangman handles duplicate letters, losses and a saved round without inflating spelling mastery', () => {
  render('hangman'); answer('p'); answer('p'); expect(host.textContent).toContain('already tried');
  for (const letter of ['b', 'c', 'd', 'f', 'g', 'h']) answer(letter);
  expect(host.textContent).toContain('The word is planet'); expect(host.textContent).toContain('0 misses remaining'); click('Next word');
  for (const word of ['bridge', 'castle', 'garden', 'winter']) {
    for (const letter of new Set(word)) answer(letter);
    click(word === 'winter' ? 'Finish round' : 'Next word');
  }
  expect(getHistory()[0]).toMatchObject({ correct: 4, incorrect: 1, mode: 'arcade-hangman' });
  expect(getWordStats().planet).toBeUndefined(); expect(document.activeElement.tagName).toBe('H2');
  click('Play another round'); expect(host.textContent).toContain('Word 1/5'); expect(getHistory()).toHaveLength(1);
});
test('ladder rejects invalid steps, supports hints and undo, then saves a solution', () => {
  render('ladder'); answer('dog'); expect(host.textContent).toContain('Change exactly one');
  answer('caz'); expect(host.textContent).toContain('not in this puzzle bank');
  click('Hint'); expect(host.textContent).toContain('Try'); answer('cot'); click('Undo step');
  for (const word of ['cot', 'dot', 'dog']) answer(word);
  click('Finish ladder'); expect(getHistory()[0].correct).toBe(1);
});
test('letter grid accepts a valid path once and reveals remaining answers', () => {
  render('grid'); answer('cat'); answer('cat'); expect(host.textContent).toContain('already found');
  answer('catac'); expect(host.textContent).toContain('No match');
  click('Finish and reveal remaining words'); expect(getHistory()[0].correct).toBe(1);
  expect(host.textContent).toContain('Answers to review');
});
test('category round validates each category against its own bank', () => {
  render('categories');
  const inputs = [...host.querySelectorAll('input')];
  ['cat', 'cat', 'canada'].forEach((word, i) => fill(inputs[i], word)); submit();
  expect(host.textContent).toContain('Foods: not in this round'); expect(inputs[0].disabled).toBe(true);
  fill(inputs[1], 'carrot'); submit(); click('Finish and see examples'); expect(getHistory()[0].correct).toBe(3);
  for (const round of CATEGORY_ROUNDS) for (const words of Object.values(round.groups)) expect(words.every(word => word.startsWith(round.letter))).toBe(true);
});
test('rhyme answers must fit the clue and completed spelling attempts are recorded', () => {
  render('rhyme');
  RHYMES.slice(0, 5).forEach((item, index) => { answer(index ? item.word : 'kite'); click(index === 4 ? 'Finish round' : 'Next rhyme'); });
  expect(getHistory()[0].correct).toBe(4); expect(getWordStats().night.incorrect).toBe(1);
});
test('bingo only marks matching calls and ends on a line', () => {
  render('bingo'); click('bridge'); expect(host.textContent).toContain('not this call'); expect(button('bridge').getAttribute('aria-pressed')).toBe('false');
  click('planet'); click('Next call'); click('bridge'); click('Next call'); click('castle');
  expect(host.textContent).toContain('Bingo!'); click('Finish bingo'); expect(getHistory()[0].correct).toBe(3);
});
test('word search supports reversed endpoints and covers the answer during recall', () => {
  render('search'); const puzzle = wordSearch(WORDS_BY_DIFFICULTY.grade5.slice(0, 6), 10), p = puzzle.placements[0];
  const first = p.row * 10 + p.col, last = (p.row + p.dr * (p.word.length - 1)) * 10 + p.col + p.dc * (p.word.length - 1);
  expect(searchSelection(puzzle.placements, last, first, 10)).toEqual(p);
  const cells = host.querySelectorAll('[aria-label="Word search grid"] button');
  act(() => cells[last].click()); act(() => cells[first].click());
  expect(host.querySelector('[aria-label="Word search grid"]')).toBeNull(); expect(host.textContent).not.toContain('PLANET');
  answer('planet'); click('Finish and reveal answers'); expect(getHistory()[0].correct).toBe(1);
});
test('guess-my-word adjusts points for hints and retains spelling corrections', () => {
  render('clues'); click('Reveal another clue'); answer('planet'); click('Next word');
  for (const word of ['bridge', 'castle', 'garden', 'winter']) { answer(word); click(word === 'winter' ? 'Finish round' : 'Next word'); }
  expect(getHistory()[0].points).toBe(1400); expect(getWordStats().planet.correct).toBe(1);
});
test('clock starts on request, expires by wall time and records results once', () => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-01-01T00:00:00Z')); render('clock');
  act(() => jest.advanceTimersByTime(65000)); expect(getHistory()).toHaveLength(0);
  click('Start one-minute round'); answer('planet'); answer('wrong'); click('Skip word');
  act(() => jest.advanceTimersByTime(60000)); expect(getHistory()[0]).toMatchObject({ correct: 1, incorrect: 2 });
  expect(getWordStats().planet.correct).toBe(1); expect(getWordStats().castle).toBeUndefined();
  act(() => jest.advanceTimersByTime(60000)); expect(getHistory()).toHaveLength(1);
});
test('clock rejects a submission after the deadline even before the next tick', () => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-01-01T00:00:00Z')); render('clock'); click('Start one-minute round');
  jest.setSystemTime(new Date('2026-01-01T00:01:01Z')); answer('planet');
  expect(host.textContent).toContain('Round complete'); expect(getHistory()).toHaveLength(0); expect(getWordStats().planet).toBeUndefined();
});
test('spoken bee validates players and host adjudication does not change personal progress', () => {
  render('bee'); fill(host.querySelector('textarea'), 'A, a'); submit(); expect(host.textContent).toContain('2–8 different');
  fill(host.querySelector('textarea'), 'Alice, Ben'); submit(); expect(host.textContent).toContain("Alice's turn");
  expect(host.textContent).not.toContain('planet'); click('Host: reveal spelling'); click('Spelled correctly'); click('Next player');
  expect(host.textContent).toContain("Ben's turn"); click('Host: reveal spelling'); click('Missed word'); click('Show winners');
  expect(host.textContent).toContain('Alice: 1 correct — winner'); expect(getHistory()).toHaveLength(0); expect(mockUpdateStats).not.toHaveBeenCalled();
});
test('relay alternates teams, corrects wrong letters and retains team results only', () => {
  render('relay'); submit(); answer('x'); expect(host.textContent).toContain('Try that letter again');
  for (const letter of 'planet') answer(letter); click('Next team'); expect(host.textContent).toContain('Team B');
  for (const word of ['bridge', 'castle', 'garden', 'winter', 'summer']) {
    for (const letter of word) answer(letter);
    click(word === 'summer' ? 'Show team results' : 'Next team');
  }
  expect(host.textContent).toContain('Team A: 2 points'); expect(host.textContent).toContain('Team B: 3 points');
  expect(getHistory()).toHaveLength(0); expect(mockUpdateStats).not.toHaveBeenCalled();
});

test('word code reserves exact matches and never over-credits repeated letters', () => {
  expect(codeFeedback('apple', 'allee')).toEqual(['correct', 'misplaced', 'absent', 'absent', 'correct']);
  expect(codeFeedback('sheep', 'eerie')).toEqual(['misplaced', 'misplaced', 'absent', 'absent', 'absent']);
  expect(codeFeedback('apple', 'apple')).toEqual(Array(5).fill('correct'));
  for (const { word } of CODE_WORDS) {
    expect(CODE_GUESSES).toContain(word);
    for (const guess of CODE_GUESSES) {
      const feedback = codeFeedback(word, guess);
      for (const letter of new Set(guess)) expect([...guess].filter((char, i) => char === letter && feedback[i] !== 'absent').length).toBeLessThanOrEqual([...word].filter(char => char === letter).length);
    }
  }
});
test('word code rejects invalid and duplicate guesses, supports a clue, and saves one win', () => {
  render('code'); answer('zzzzz'); expect(host.textContent).toContain('6 guesses remaining');
  answer('train'); answer('train'); expect(host.textContent).toContain('already tried'); expect(host.textContent).toContain('5 guesses remaining');
  click('Show meaning clue'); expect(host.textContent).toContain('A crisp fruit');
  answer('apple'); expect(host.textContent).toContain('Solved!'); click('Finish word code');
  expect(getHistory()[0]).toMatchObject({ correct: 1, points: 500, mode: 'arcade-code' }); expect(getWordStats().apple).toBeUndefined();
  click('Play another round'); expect(host.textContent).toContain('6 guesses remaining'); expect(getHistory()).toHaveLength(1);
});
test('word code reveals the answer after six unsuccessful guesses', () => {
  render('code'); for (const word of ['train', 'water', 'beach', 'brain', 'chair', 'cloud']) answer(word);
  expect(host.textContent).toContain('Out of guesses. The word is apple'); expect(host.querySelector('input').disabled).toBe(true);
  click('Finish word code'); expect(getHistory()[0]).toMatchObject({ incorrect: 1, points: 0 });
});
test('every hive has unique legal words, definitions and a pangram', () => {
  for (const puzzle of HIVES) {
    expect(new Set(puzzle.letters).size).toBe(7); expect(new Set(puzzle.words.map(item => item.word)).size).toBe(puzzle.words.length);
    expect(puzzle.words.some(item => puzzle.letters.every(letter => item.word.includes(letter)))).toBe(true);
    for (const item of puzzle.words) { expect(checkHiveWord(item.word, puzzle, [])).toBeNull(); expect(item.clue).toBeTruthy(); }
  }
  expect(hivePoints('pale', HIVES[0].letters)).toBe(1); expect(hivePoints('planets', HIVES[0].letters)).toBe(14);
});
test('hive validates centre, letters, dictionary and duplicates without adding points', () => {
  render('hive'); answer('cat'); expect(host.textContent).toContain('at least four');
  answer('sleep'); expect(host.textContent).toContain('centre letter A');
  answer('rain'); expect(host.textContent).toContain('only the seven');
  answer('aaaa'); expect(host.textContent).toContain('curated word list');
  answer('planets'); expect(host.textContent).toContain('Pangram!'); answer('planets'); expect(host.textContent).toContain('already found');
  click('Give me a clue'); expect(host.textContent).toContain('Clue: A world that orbits a star.');
  click('Shuffle letters'); expect(host.textContent).toContain('1/32 words found');
  click('Finish and review hive'); expect(getHistory()[0]).toMatchObject({ correct: 1, points: 14, mode: 'arcade-hive' });
  expect(getWordStats().planets).toBeUndefined(); expect(host.textContent).toContain('Worlds that orbit a star.');
});
test('hive letter buttons build a spelling and restore keyboard focus', () => {
  render('hive');
  for (const letter of 'plate') {
    const label = letter === 'a' ? 'Add required centre letter A' : `Add ${letter.toUpperCase()}`;
    act(() => host.querySelector(`button[aria-label="${label}"]`).click());
  }
  expect(host.querySelector('input').value).toBe('plate'); expect(document.activeElement).toBe(host.querySelector('input'));
  submit(); expect(host.textContent).toContain('A flat dish for serving food. +5 points.');
});
