import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Arcade from "./Arcade";
import FlappyFlight from "@/components/FlappyFlight";
import { getHistory, getWordStats } from "@/lib/storage";

global.IS_REACT_ACT_ENVIRONMENT = true;
let mockSearch = '';
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(mockSearch)],
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });
jest.mock("@/context/AppContext", () => ({ useApp: () => ({ settings: { reducedMotion: true }, updateStats: jest.fn(), refresh: jest.fn() }) }));
jest.mock("@/lib/speech", () => ({ speak: jest.fn(), cancelSpeech: jest.fn() }));
jest.mock("@/data/words", () => ({
  WORDS_BY_DIFFICULTY: { grade5: [{ word: "planet", definition: "A world travelling around a star.", spellingTip: "One n." }] },
  DIFFICULTY_META: { grade5: { label: "Very Easy" } },
  WORD_MAP: new Map(),
}));
let host, root;
beforeEach(() => { localStorage.clear(); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
function render(url) { mockSearch = url.split('?')[1] || ''; act(() => root.render(<Arcade />)); }
function click(text) { const button = [...host.querySelectorAll("button")].find(b => b.textContent.includes(text)); act(() => button.click()); }
function enter(text) { const input = host.querySelector('input'); act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text); input.dispatchEvent(new Event('input', { bubbles: true })); }); }
function submit() { act(() => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }

test("detective records one attempt and a numeric history summary", () => {
  render('/arcade?game=detective&level=grade5');
  expect(host.textContent).not.toContain('planet');
  enter('planet'); submit(); submit();
  expect(getWordStats().planet.attempts).toBe(1);
  expect(host.textContent).toContain('Correct!');
  click('Continue');
  expect(host.textContent).toContain('Round complete');
  expect(getHistory()[0].correct).toBe(1);
  expect(getHistory()[0].incorrect).toBe(0);
});
test("reduced-motion Flappy Bee starts with spelling and supports correction", () => {
  render('/arcade?game=flappy&level=grade5');
  expect(host.querySelector('svg')).toBeNull();
  enter('planit'); submit();
  expect(host.textContent).toContain('The answer is planet');
  expect(host.textContent).toContain('One n.');
  click('Continue');
  expect(getWordStats().planet.incorrect).toBe(1);
  expect(getHistory()[0].correct).toBe(0);
});
test("choosing a word pair does not count as spelling mastery", () => {
  render('/arcade?game=pairs');
  act(() => host.querySelector('input[value="there"]').click()); submit();
  expect(host.textContent).toContain('Correct!');
  expect(getWordStats().there).toBeUndefined();
  click('Continue');
  expect(host.textContent).toContain('The children packed');
  expect(host.querySelector('input:checked')).toBeNull();
});
test("flight can pause, skip and clean up without duplicate completions", () => {
  jest.useFakeTimers();
  const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => setTimeout(() => fn(Date.now()), 16));
  const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => clearTimeout(id));
  const finished = jest.fn();
  act(() => root.render(<FlappyFlight onFinish={finished} />));
  click('Pause');
  act(() => jest.advanceTimersByTime(5000));
  expect(finished).not.toHaveBeenCalled();
  click('Skip flight');
  act(() => jest.advanceTimersByTime(5000));
  expect(finished).toHaveBeenCalledTimes(1);
  expect(finished).toHaveBeenCalledWith(true);
  act(() => root.unmount()); root = createRoot(host);
  raf.mockRestore(); cancel.mockRestore(); jest.useRealTimers();
});
