import React, { act } from "react";
import { createRoot } from "react-dom/client";
import PersonalPacks from "./PersonalPacks";
global.IS_REACT_ACT_ENVIRONMENT = true;
const mockUpdateSettings = jest.fn();
let mockSettings;
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/context/AppContext', () => ({ useApp: () => ({ settings: mockSettings, updateSettings: mockUpdateSettings }) }));
let host, root;
beforeEach(() => { mockSettings = { personalPacks: [{ id: 'existing', title: 'Homework', words: ['bee', 'moon', 'star'] }] }; mockUpdateSettings.mockReset(); mockUpdateSettings.mockImplementation(patch => { mockSettings = { ...mockSettings, ...patch }; }); host = document.createElement('div'); document.body.append(host); root = createRoot(host); act(() => root.render(<PersonalPacks onPrint={() => {}} />)); });
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
test('archiving hides a pack and restoring keeps its identity and every word', () => {
  click('Archive pack');
  const patch = mockUpdateSettings.mock.calls[0][0];
  expect(Object.keys(patch)).toEqual(['personalPacks']);
  expect(patch.personalPacks[0]).toMatchObject({ id: 'existing', title: 'Homework', words: ['bee', 'moon', 'star'], archived: true });
  act(() => root.render(<PersonalPacks onPrint={() => {}} />));
  expect(host.querySelector('a')).toBeNull();
  expect(host.textContent).toContain('Archived packs (1)');
  click('Restore Homework');
  act(() => root.render(<PersonalPacks onPrint={() => {}} />));
  expect(host.querySelector('a').getAttribute('href')).toContain('pack=existing');
  expect(mockSettings.personalPacks[0].words).toEqual(['bee', 'moon', 'star']);
  expect(mockSettings.personalPacks[0].archived).toBe(false);
});
test('archiving the pack being edited clears the editor', () => {
  click('Edit pack'); click('Archive pack');
  expect(host.querySelector('input').value).toBe('');
  expect(host.textContent).not.toContain('Save changes');
});
