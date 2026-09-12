// Wrapper around the browser Web Speech API (SpeechSynthesis).

export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let cachedVoices = [];

export function loadVoices() {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) return resolve([]);
    let voices = window.speechSynthesis.getVoices();
    if (voices && voices.length) {
      cachedVoices = voices;
      return resolve(voices);
    }
    const handler = () => {
      voices = window.speechSynthesis.getVoices();
      cachedVoices = voices;
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(voices);
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    // Fallback in case event never fires
    setTimeout(() => {
      voices = window.speechSynthesis.getVoices();
      if (voices && voices.length) {
        cachedVoices = voices;
        resolve(voices);
      }
    }, 400);
  });
}

export function getCachedVoices() {
  return cachedVoices;
}

const RATE_PRESETS = {
  slow: 0.7,
  normal: 0.95,
  fast: 1.2,
};

export function speak(text, opts = {}) {
  if (!isSpeechSupported() || !text) return;
  const {
    rate = "normal", // slow | normal | fast | number
    pitch = 1,
    volume = 1,
    voiceName = null,
    onEnd = null,
    onStart = null,
  } = opts;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = typeof rate === "number" ? rate : RATE_PRESETS[rate] ?? 0.95;
  utter.pitch = pitch;
  utter.volume = volume;
  utter.lang = "en-US";

  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  if (voiceName) {
    const match = voices.find((v) => v.name === voiceName);
    if (match) utter.voice = match;
  } else {
    // Prefer an English voice
    const preferred = voices.find((v) => /en(-|_)?(US|GB|AU)/i.test(v.lang) && /female|samantha|karen|google/i.test(v.name)) ||
                      voices.find((v) => /^en/i.test(v.lang));
    if (preferred) utter.voice = preferred;
  }

  if (onEnd) utter.onend = onEnd;
  if (onStart) utter.onstart = onStart;
  window.speechSynthesis.speak(utter);
  return utter;
}

export function cancelSpeech() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

// Simple success / failure sounds via WebAudio
let audioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function playTone(kind = "success") {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  if (kind === "success") {
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(990, now + 0.18);
  } else {
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  osc.start(now);
  osc.stop(now + 0.4);
}
