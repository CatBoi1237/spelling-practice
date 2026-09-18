// Browser speech is a single shared queue. A new request owns it until cancelled.
export function isSpeechSupported() {
  return typeof window !== "undefined" && Boolean(window.speechSynthesis) && typeof window.SpeechSynthesisUtterance === "function";
}

let cachedVoices = [];
let activeUtterance = null;
let sequenceTimer = null;
let generation = 0;

export function loadVoices() {
  return new Promise(resolve => {
    if (!isSpeechSupported()) return resolve([]);
    const synth = window.speechSynthesis;
    let timer;
    const finish = () => {
      clearTimeout(timer);
      synth.removeEventListener("voiceschanged", finish);
      cachedVoices = synth.getVoices() || [];
      resolve(cachedVoices);
    };
    if (synth.getVoices()?.length) { finish(); return; }
    synth.addEventListener("voiceschanged", finish);
    // Resolve even when the browser has no installed voices or never fires an event.
    timer = setTimeout(finish, 400);
  });
}

export function getCachedVoices() { return cachedVoices; }

const RATE_PRESETS = { verySlow: 0.5, slow: 0.7, normal: 0.95, fast: 1.2 };

export function cancelSpeech() {
  generation++;
  clearTimeout(sequenceTimer);
  sequenceTimer = null;
  const hadActiveUtterance = Boolean(activeUtterance);
  if (activeUtterance) {
    activeUtterance.onend = null;
    activeUtterance.onerror = null;
    activeUtterance.onstart = null;
    activeUtterance = null;
  }
  if (isSpeechSupported()) {
    const synth = window.speechSynthesis;
    if (hadActiveUtterance || synth.speaking || synth.pending) synth.cancel();
  }
}

function enqueue(text, opts, request) {
  if (!isSpeechSupported() || !text) { opts.onError?.({ error: "unavailable" }); return; }
  try {
    const synth = window.speechSynthesis;
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.rate = typeof opts.rate === "number" ? opts.rate : RATE_PRESETS[opts.rate] ?? 0.95;
    utter.pitch = opts.pitch ?? 1;
    utter.volume = opts.volume ?? 1;
    const lang = opts.voiceLang && opts.voiceLang !== "auto" ? opts.voiceLang : "en-US";
    // Voices can arrive after startup or change while the page is open.
    const voices = synth.getVoices() || [];
    cachedVoices = voices;
    const matches = voices.filter(v => v.lang.replaceAll("_", "-").toLowerCase() === lang.toLowerCase());
    const localVoice = opts.preferLocal ? voices.find(v => v.localService && /^en[-_]/i.test(v.lang)) : null;
    const selected = localVoice || voices.find(v => v.name === opts.voiceName) ||
      matches.find(v => /google|natural|premium|karen|catherine|serena|samantha|daniel/i.test(v.name)) || matches[0] ||
      voices.find(v => /^en[-_]/i.test(v.lang));
    if (selected) utter.voice = selected;
    utter.lang = selected?.lang || lang;
    activeUtterance = utter;
    utter.onstart = event => { if (request === generation) opts.onStart?.(event); };
    utter.onend = event => {
      if (request !== generation) return;
      activeUtterance = null; opts.onEnd?.(event);
    };
    utter.onerror = event => {
      if (request !== generation) return;
      activeUtterance = null;
      if (event.error !== "canceled" && event.error !== "interrupted") opts.onError?.(event);
    };
    if (synth.paused) synth.resume();
    // Keep this synchronous so replay buttons retain the browser's user gesture.
    synth.speak(utter);
    return utter;
  } catch (error) {
    activeUtterance = null;
    if (request === generation) opts.onError?.({ error: "synthesis-failed", cause: error });
  }
}

export function speak(text, opts = {}) {
  cancelSpeech();
  return enqueue(text, opts, generation);
}

// Judge-style: word, pause, sentence, pause, word. Cancellation invalidates every step.
export function speakSequence(parts, opts = {}) {
  cancelSpeech();
  const request = generation;
  let index = 0;
  const next = () => {
    if (request !== generation || index >= parts.length) return;
    const text = parts[index++];
    enqueue(text, { ...opts, onEnd: event => {
      if (request !== generation) return;
      if (index < parts.length) sequenceTimer = setTimeout(next, 550);
      else opts.onEnd?.(event);
    } }, request);
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
