const LISTS_KEY = "spellbee.customWordLists.v1";
const GAME_PREFIX = "spellbee.customGameList.v1";

export const MULTIPLAYER_WORD_COUNTS = [5, 10, 15, 25];

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function cleanWord(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 40);
}

export function parseCustomWords(text) {
  const parts = String(text || "")
    .split(/[\n,;]+/)
    .map(cleanWord)
    .filter(Boolean);

  const seen = new Set();
  const words = [];

  for (const word of parts) {
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(word);
  }

  return words.slice(0, 25);
}

export function isMultiplayerWordCount(count) {
  return MULTIPLAYER_WORD_COUNTS.includes(Number(count));
}

export function getCustomWordLists() {
  if (typeof window === "undefined") return [];

  const parsed = safeJsonParse(localStorage.getItem(LISTS_KEY), []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item) => item && item.id && Array.isArray(item.words))
    .map((item) => ({
      id: String(item.id),
      name: String(item.name || "Untitled list").slice(0, 60),
      words: item.words.map(cleanWord).filter(Boolean).slice(0, 25),
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null,
    }))
    .filter((item) => item.words.length > 0)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function writeLists(lists) {
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  window.dispatchEvent(new CustomEvent("spellbee:word-lists-changed"));
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `list-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveCustomWordList({ id, name, words }) {
  const cleanName = String(name || "").trim().slice(0, 60);
  const cleanWords = Array.isArray(words)
    ? words.map(cleanWord).filter(Boolean).slice(0, 25)
    : [];

  if (!cleanName) {
    throw new Error("Give your word list a name.");
  }

  if (!isMultiplayerWordCount(cleanWords.length)) {
    throw new Error("Custom multiplayer lists must contain exactly 5, 10, 15, or 25 unique words.");
  }

  const now = new Date().toISOString();
  const lists = getCustomWordLists();
  const existing = id ? lists.find((item) => item.id === id) : null;

  const next = {
    id: existing?.id || makeId(),
    name: cleanName,
    words: cleanWords,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const withoutCurrent = lists.filter((item) => item.id !== next.id);
  writeLists([next, ...withoutCurrent]);
  return next;
}

export function deleteCustomWordList(id) {
  const lists = getCustomWordLists().filter((item) => item.id !== id);
  writeLists(lists);
}

export function getCustomWordList(id) {
  if (!id) return null;
  return getCustomWordLists().find((item) => item.id === id) || null;
}

function gameKey(mode, code) {
  return `${GAME_PREFIX}:${mode}:${String(code || "").toUpperCase()}`;
}

export function assignCustomListToGame(mode, code, list) {
  if (typeof window === "undefined" || !code || !list?.words?.length) return;

  const snapshot = {
    id: list.id || null,
    name: list.name || "Custom list",
    words: list.words.map(cleanWord).filter(Boolean).slice(0, 25),
  };

  localStorage.setItem(gameKey(mode, code), JSON.stringify(snapshot));
}

export function getAssignedCustomList(mode, code) {
  if (typeof window === "undefined" || !code) return null;

  const parsed = safeJsonParse(localStorage.getItem(gameKey(mode, code)), null);
  if (!parsed || !Array.isArray(parsed.words) || !parsed.words.length) return null;

  return {
    id: parsed.id || null,
    name: String(parsed.name || "Custom list").slice(0, 60),
    words: parsed.words.map(cleanWord).filter(Boolean).slice(0, 25),
  };
}

function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function encodeRaceList(list) {
  const payload = JSON.stringify({
    n: String(list?.name || "Custom list").slice(0, 60),
    w: Array.isArray(list?.words) ? list.words.map(cleanWord).filter(Boolean).slice(0, 25) : [],
  });

  return bytesToBase64Url(new TextEncoder().encode(payload));
}

export function decodeRaceList(payload) {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(payload));
    const parsed = JSON.parse(json);
    const words = Array.isArray(parsed?.w)
      ? parsed.w.map(cleanWord).filter(Boolean).slice(0, 25)
      : [];

    if (!isMultiplayerWordCount(words.length)) return null;

    return {
      id: null,
      name: String(parsed?.n || "Custom list").slice(0, 60),
      words,
    };
  } catch {
    return null;
  }
}

export function buildCustomRacePath(code, list) {
  const payload = encodeRaceList(list);
  return `/room/${String(code || "").toUpperCase()}?wl=${encodeURIComponent(payload)}`;
}

export function getActiveGameCustomList() {
  if (typeof window === "undefined") return null;

  const match = window.location.pathname.match(/^\/(room|classroom)\/([A-Z0-9]{6})/i);
  if (!match) return null;

  const mode = match[1].toLowerCase();
  const code = match[2].toUpperCase();

  if (mode === "room") {
    const payload = new URLSearchParams(window.location.search).get("wl");
    if (payload) {
      const decoded = decodeRaceList(payload);
      if (decoded) {
        assignCustomListToGame("room", code, decoded);
        return decoded;
      }
    }
  }

  return getAssignedCustomList(mode, code);
}
