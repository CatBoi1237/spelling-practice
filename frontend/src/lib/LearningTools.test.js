import { mergeProgress } from "./sync";
import { KEYS } from "./storage";
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
