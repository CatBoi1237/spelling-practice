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
  verySlow: 0.5,
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
    voiceLang = "auto",
    onEnd = null,
    onStart = null,
  } = opts;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = typeof rate === "number" ? rate : RATE_PRESETS[rate] ?? 0.95;
  utter.pitch = pitch;
  utter.volume = volume;
  utter.lang = voiceLang && voiceLang !== "auto" ? voiceLang : "en-US";

  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  const langMatch = voiceLang && voiceLang !== "auto" ? voices.filter((v) => v.lang.replace("_", "-").toLowerCase() === voiceLang.toLowerCase()) : [];
  if (voiceName && voices.find((v) => v.name === voiceName)) {
    utter.voice = voices.find((v) => v.name === voiceName);
  } else if (langMatch.length) {
    utter.voice = langMatch.find((v) => /google|natural|premium|karen|catherine|serena|samantha|daniel/i.test(v.name)) || langMatch[0];
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

// Judge-style: "word. <pause> sentence. <pause> word."
export function speakSequence(parts, opts = {}) {
  if (!isSpeechSupported() || !parts.length) return;
  window.speechSynthesis.cancel();
  let i = 0;
  const next = () => {
    if (i >= parts.length) return;
    const text = parts[i++];
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = typeof opts.rate === "number" ? opts.rate : RATE_PRESETS[opts.rate] ?? 0.95;
    utter.lang = opts.voiceLang && opts.voiceLang !== "auto" ? opts.voiceLang : "en-US";
    const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.name === opts.voiceName) || voices.find((x) => x.lang.replace("_", "-").toLowerCase() === utter.lang.toLowerCase()) || voices.find((x) => /^en/i.test(x.lang));
    if (v) utter.voice = v;
    utter.onend = () => setTimeout(next, 550);
    utter.onerror = () => setTimeout(next, 200);
    window.speechSynthesis.speak(utter);
  };
  next();
}

export const VOICE_LANGS = [
  { id: "auto", label: "Auto" },
  { id: "en-AU", label: "English (Australia)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "en-US", label: "English (US)" },
];

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
  } else if (kind === "achievement") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(523, now);
    osc.frequency.setValueAtTime(659, now + 0.12);
    osc.frequency.setValueAtTime(784, now + 0.24);
    osc.frequency.setValueAtTime(1046, now + 0.36);
  } else if (kind === "tick") {
    osc.frequency.setValueAtTime(880, now);
  } else {
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  const len = kind === "achievement" ? 0.7 : kind === "tick" ? 0.08 : 0.4;
  gain.gain.cancelScheduledValues(now + 0.02);
  gain.gain.setValueAtTime(0.25, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + len);
  osc.start(now);
  osc.stop(now + len + 0.05);
}
