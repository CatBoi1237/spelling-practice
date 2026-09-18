import { appendHistory, getHistory, getPracticeDays, getArcadeRecords, KEYS, resetAll } from './storage';
import { mergeProgress } from './sync';
import { practiceStreak, recordsFromHistory, mergeArcadeRecords } from './progressArchive';
jest.mock('@/lib/api', () => ({ api: {} }));
beforeEach(() => localStorage.clear());
const perfect = { date: '2026-08-01T12:00:00', mode: 'arcade-memory', difficulty: 'grade5', correct: 10, incorrect: 0, points: 1000, roundLength: 10, timingVersion: 2, avgTime: 2 };

test('personal records and practice days survive the 100-session history cap', () => {
  appendHistory(perfect);
  for (let i = 0; i < 105; i++) appendHistory({ date: new Date(2026, 8, 18, 12, i).toISOString(), mode: 'classic', correct: 3, incorrect: 0 });
  expect(getHistory()).toHaveLength(100);
  expect(getHistory().some(s => s.mode === 'arcade-memory')).toBe(false);
  expect(getPracticeDays()).toContain('2026-08-01');
  expect(getArcadeRecords()['arcade-memory:grade5'].rounds[10]).toEqual({ accuracy: 100, perfectSeconds: 2 });
});

test('sync keeps the fastest record and all practice days without duplication', () => {
  const local = { [KEYS.practiceDays]: ['2026-09-17'], [KEYS.arcadeRecords]: recordsFromHistory([perfect]) };
  const remote = { [KEYS.practiceDays]: ['2026-09-17', '2026-09-18'], [KEYS.arcadeRecords]: recordsFromHistory([{ ...perfect, avgTime: 4 }]) };
  const merged = mergeProgress(local, remote);
  expect(merged[KEYS.practiceDays]).toEqual(['2026-09-17', '2026-09-18']);
  expect(merged[KEYS.arcadeRecords]['arcade-memory:grade5'].rounds[10].perfectSeconds).toBe(2);
  expect(mergeProgress(remote, local)[KEYS.arcadeRecords]).toEqual(merged[KEYS.arcadeRecords]);
});

test('partial rounds, wrong answers, and old timing do not earn perfect speed records', () => {
  const record = recordsFromHistory([{ ...perfect, correct: 5 }, { ...perfect, correct: 9, incorrect: 1 }, { ...perfect, timingVersion: undefined }])['arcade-memory:grade5'];
  expect(record.rounds[10].perfectSeconds).toBeNull();
  expect(mergeArcadeRecords({ 'arcade-memory:grade5': record }, recordsFromHistory([perfect]))['arcade-memory:grade5'].rounds[10].perfectSeconds).toBe(2);
});

test('streaks use local calendar days and allow today to be unfinished', () => {
  const today = new Date(2026, 8, 18, 8);
  expect(practiceStreak(['2026-09-16', '2026-09-17'], today)).toBe(2);
  expect(practiceStreak(['2026-09-16', '2026-09-17', '2026-09-18'], today)).toBe(3);
  expect(practiceStreak(['2026-09-15', '2026-09-16'], today)).toBe(0);
});

test('legacy history is available immediately and an explicit progress reset clears archives', () => {
  localStorage.setItem(KEYS.history, JSON.stringify([perfect]));
  expect(getArcadeRecords()['arcade-memory:grade5'].points).toBe(1000);
  appendHistory({ ...perfect, date: '2026-09-18T12:00:00' }); resetAll();
  expect(getArcadeRecords()).toEqual({}); expect(getPracticeDays()).toEqual([]);
});
