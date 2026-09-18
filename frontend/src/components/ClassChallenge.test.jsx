import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ClassChallenge from './ClassChallenge';
import { api } from '@/lib/api';
jest.mock('@/lib/api', () => ({ api: { put: jest.fn() }, apiError: () => 'Could not save the challenge.' }));
global.IS_REACT_ACT_ENVIRONMENT = true;
const room = { code: 'CLASS1', challenge: { title: 'Team goal', target: 5, completed: 2 } };
let host, root, saved;
beforeEach(() => { api.put.mockReset(); saved = jest.fn(); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
function render(teacher = true, challenge = room.challenge) { act(() => root.render(<ClassChallenge room={{ ...room, challenge }} teacher={teacher} onSaved={saved} />)); }
async function submit() { await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); }

test('ordinary editing keeps the current period; restarting requires an explicit choice', async () => {
  api.put.mockResolvedValue({ data: room.challenge }); render(); await submit();
  expect(api.put).toHaveBeenLastCalledWith('/teacher/classes/CLASS1/challenge', { title: 'Team goal', target: 5, restart: false });
  act(() => host.querySelector('input[type="checkbox"]').click());
  expect(host.textContent).toContain('All assignments and student results are retained');
  await submit();
  expect(api.put).toHaveBeenLastCalledWith('/teacher/classes/CLASS1/challenge', { title: 'Team goal', target: 5, restart: true });
  expect(host.querySelector('input[type="checkbox"]').checked).toBe(false);
  expect(saved).toHaveBeenCalledTimes(2);
});
test('failed saves preserve the restart choice and allow retry', async () => {
  api.put.mockRejectedValue(new Error('offline')); render();
  act(() => host.querySelector('input[type="checkbox"]').click()); await submit();
  expect(host.querySelector('[role="alert"]').textContent).toContain('Could not save');
  expect(host.querySelector('input[type="checkbox"]').checked).toBe(true);
  expect(saved).not.toHaveBeenCalled();
});
test('students see current and previous goals but cannot change them', () => {
  render(false, { ...room.challenge, started_at: '2026-09-18T12:00:00Z', history: [{ title: 'Old goal', target: 1, completed: 1, ended_at: '2026-09-17T12:00:00Z' }] });
  expect(host.querySelector('form')).toBeNull();
  expect(host.textContent).toContain('Only submissions since this goal started count');
  expect(host.textContent).toContain('Old goal');
  expect(api.put).not.toHaveBeenCalled();
});
