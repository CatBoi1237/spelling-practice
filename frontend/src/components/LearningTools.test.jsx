import React, { act } from "react";
import { createRoot } from "react-dom/client";
import PersonalPacks from "./PersonalPacks";
global.IS_REACT_ACT_ENVIRONMENT = true;
const mockUpdateSettings = jest.fn();
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/context/AppContext', () => ({ useApp: () => ({ settings: { personalPacks: [{ id: 'existing', title: 'Homework', words: ['bee', 'moon', 'star'] }] }, updateSettings: mockUpdateSettings }) }));
let host, root;
beforeEach(() => { mockUpdateSettings.mockClear(); host = document.createElement('div'); document.body.append(host); root = createRoot(host); act(() => root.render(<PersonalPacks onPrint={() => {}} />)); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
function click(text) { act(() => [...host.querySelectorAll('button')].find(b => b.textContent === text).click()); }
function enter(element, value) { act(() => { Object.getOwnPropertyDescriptor(element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); }); }
test('editing keeps the pack identity and does not replace shared progress', () => {
  click('Edit pack');
  expect(host.querySelector('input').value).toBe('Homework');
  enter(host.querySelector('input'), 'Reading words');
  enter(host.querySelector('textarea'), 'planet, rocket, moon');
  act(() => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
  const patch = mockUpdateSettings.mock.calls[0][0];
  expect(Object.keys(patch)).toEqual(['personalPacks']);
  expect(patch.personalPacks).toHaveLength(1);
  expect(patch.personalPacks[0]).toMatchObject({ id: 'existing', title: 'Reading words', words: ['planet', 'rocket', 'moon'] });
});
test('cancel editing leaves the existing pack untouched', () => {
  click('Edit pack'); enter(host.querySelector('input'), 'Unsaved'); click('Cancel editing');
  expect(host.querySelector('input').value).toBe('');
  expect(mockUpdateSettings).not.toHaveBeenCalled();
});
