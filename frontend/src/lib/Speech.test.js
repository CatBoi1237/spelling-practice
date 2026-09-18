import { speak, speakSequence, cancelSpeech, loadVoices } from './speech';

let synth;
const originalSynth = window.speechSynthesis, originalUtterance = window.SpeechSynthesisUtterance;
beforeEach(() => {
  jest.useFakeTimers();
  synth = { speak: jest.fn(), cancel: jest.fn(), resume: jest.fn(), paused: false, speaking: false, pending: false, getVoices: jest.fn(() => []), addEventListener: jest.fn(), removeEventListener: jest.fn() };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, writable: true, value: synth });
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
});
afterEach(() => { cancelSpeech(); jest.useRealTimers(); window.speechSynthesis = originalSynth; window.SpeechSynthesisUtterance = originalUtterance; });

test('voice loading resolves even if Edge never supplies a voice list', async () => {
  const voices = loadVoices(); jest.advanceTimersByTime(400);
  await expect(voices).resolves.toEqual([]);
  expect(synth.removeEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function));
});
test('late voices and a missing saved voice use the current available English voice', async () => {
  const loading = loadVoices();
  const voice = { name: 'Microsoft Hazel', lang: 'en-GB', localService: true };
  synth.getVoices.mockReturnValue([voice]); synth.addEventListener.mock.calls[0][1]();
  await expect(loading).resolves.toEqual([voice]);
  const utter = speak('planet', { voiceName: 'Removed voice', voiceLang: 'en-AU' });
  expect(utter.voice).toBe(voice); expect(utter.lang).toBe('en-GB');
});
test('manual replay remains synchronous, resumes paused speech, and avoids idle cancel', () => {
  synth.paused = true;
  const utter = speak('planet');
  expect(synth.resume).toHaveBeenCalledTimes(1);
  expect(synth.speak).toHaveBeenCalledWith(utter);
  expect(synth.cancel).not.toHaveBeenCalled();
});
test('installed-voice retry overrides an unavailable or online saved voice', () => {
  const online = { name: 'Online', lang: 'en-US', localService: false }, local = { name: 'Installed', lang: 'en-GB', localService: true };
  synth.getVoices.mockReturnValue([online, local]);
  expect(speak('bee', { voiceName: 'Online', preferLocal: true }).voice).toBe(local);
});
test('cancelled sequences never start a stale sentence after a new word', () => {
  speakSequence(['old word', 'old sentence', 'old word']);
  const old = synth.speak.mock.calls[0][0]; old.onend();
  speak('new word'); jest.advanceTimersByTime(2000);
  expect(synth.speak.mock.calls.map(([utter]) => utter.text)).toEqual(['old word', 'new word']);
});
test('late completion events from replaced speech do not call old callbacks', () => {
  const end = jest.fn(); const old = speak('old', { onEnd: end }); const oldEnd = old.onend;
  speak('new'); oldEnd({}); expect(end).not.toHaveBeenCalled();
});
test('browser speech errors and thrown failures are reported', () => {
  const error = jest.fn(); const utter = speak('bee', { onError: error });
  utter.onerror({ error: 'not-allowed' }); expect(error).toHaveBeenCalledWith({ error: 'not-allowed' });
  synth.speak.mockImplementation(() => { throw new Error('audio unavailable'); });
  speak('bee', { onError: error }); expect(error).toHaveBeenLastCalledWith(expect.objectContaining({ error: 'synthesis-failed' }));
});
