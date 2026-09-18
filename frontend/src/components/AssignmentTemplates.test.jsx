import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AssignmentTemplates from './AssignmentTemplates';
import { templateDeadline } from '@/lib/assignmentTemplates';
global.IS_REACT_ACT_ENVIRONMENT = true;
const mockUpdateSettings = jest.fn();
let mockTeacher = true;
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher' }, isTeacher: mockTeacher }) }));
jest.mock('@/context/AppContext', () => ({ useApp: () => ({ settings: { assignmentTemplates: {
  teacher: [{ id: 'weekly', title: 'Weekly words', source: 'grade5', count: 10, attempts: 2, dueDays: 7, dueTime: '16:00' }, { id: 'old', title: 'Old pack', deleted: true }],
  otherTeacher: [{ id: 'private', title: 'Other teacher' }],
} }, updateSettings: mockUpdateSettings }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
let host, root, apply;
beforeEach(() => { mockTeacher = true; mockUpdateSettings.mockClear(); apply = jest.fn(); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
function render() { act(() => root.render(<AssignmentTemplates values={{ title: 'Changed', source: 'grade6', count: 15, attempts: 3 }} onApply={apply} />)); }
function click(label) { act(() => [...host.querySelectorAll('button')].find(b => b.textContent === label).click()); }

test('relative deadlines use local calendar days and legacy templates remain manual', () => {
  expect(templateDeadline({ dueDays: 7, dueTime: '16:30' }, new Date(2026, 11, 28, 9))).toBe('2027-01-04T16:30');
  expect(templateDeadline({ dueDays: 1, dueTime: '08:00' }, new Date(2026, 8, 30, 22))).toBe('2026-10-01T08:00');
  expect(templateDeadline({})).toBe('');
  expect(templateDeadline({ dueDays: 7, dueTime: '25:00' })).toBe('');
  expect(templateDeadline({ dueDays: -1, dueTime: '16:00' })).toBe('');
});
test('loading and updating a template preserves identity and other teacher data', () => {
  render(); expect(host.textContent).not.toContain('Other teacher');
  click('Use Weekly words'); expect(apply).toHaveBeenCalledWith(expect.objectContaining({ id: 'weekly', dueDays: 7 }));
  click('Update loaded template');
  const patch = mockUpdateSettings.mock.calls[0][0].assignmentTemplates;
  expect(patch.teacher).toHaveLength(2);
  expect(patch.teacher[0]).toMatchObject({ id: 'weekly', title: 'Changed', source: 'grade6', dueDays: 7, dueTime: '16:00' });
  expect(patch.otherTeacher).toEqual([{ id: 'private', title: 'Other teacher' }]);
});
test('archived templates can be restored without creating a copy', () => {
  render(); click('Restore Old pack');
  expect(mockUpdateSettings.mock.calls[0][0].assignmentTemplates.teacher[1]).toMatchObject({ id: 'old', deleted: false });
});
test('student accounts cannot use template controls', () => {
  mockTeacher = false; render(); expect(host.textContent).toBe('');
});
