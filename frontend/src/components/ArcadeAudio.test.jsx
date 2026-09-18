import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ArcadeAudio from './ArcadeAudio';
import { speak, cancelSpeech } from '@/lib/speech';
jest.mock('@/lib/speech', () => ({ speak: jest.fn(), cancelSpeech: jest.fn(), isSpeechSupported: () => true }));
global.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
const settings = { rate: 'normal', voiceName: 'Saved voice', voiceLang: 'en-AU' };
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); jest.useRealTimers(); });
function render(text = 'planet', autoPlay = false) { act(() => root.render(<ArcadeAudio text={text} settings={settings} autoPlay={autoPlay} />)); }
function click(label) { act(() => [...host.querySelectorAll('button')].find(button => button.textContent === label).click()); }

test('autoplay speaks the current word and changed words cancel previous audio', () => {
  render('planet', true); expect(speak).toHaveBeenLastCalledWith('planet', expect.objectContaining({ voiceName: 'Saved voice', voiceLang: 'en-AU' }));
  const stale = speak.mock.calls[0][1]; render('rocket', true);
  expect(cancelSpeech).toHaveBeenCalled(); expect(speak).toHaveBeenLastCalledWith('rocket', expect.any(Object));
  act(() => stale.onError({ error: 'not-allowed' }));
  expect(host.textContent).not.toContain('The voice did not start');
});
test('silent startup offers retry, slow playback and installed-voice fallback', () => {
  render('planet', true); act(() => jest.advanceTimersByTime(4000));
  expect(host.textContent).toContain('The voice did not start');
  click('Hear word'); expect(speak).toHaveBeenCalledTimes(2);
  click('Hear slowly'); expect(speak).toHaveBeenLastCalledWith('planet', expect.objectContaining({ rate: 'slow' }));
  click('Try installed voice'); expect(speak).toHaveBeenLastCalledWith('planet', expect.objectContaining({ preferLocal: true, voiceName: null, voiceLang: 'auto' }));
});
test('playing events clear the startup watchdog and stopping cancels speech', () => {
  render(); expect(speak).not.toHaveBeenCalled(); click('Hear word');
  act(() => speak.mock.calls[0][1].onStart());
  act(() => jest.advanceTimersByTime(5000)); expect(host.textContent).toContain('Playing audio');
  click('Stop audio'); expect(host.textContent).not.toContain('Playing audio');
  expect(cancelSpeech).toHaveBeenCalled();
});
