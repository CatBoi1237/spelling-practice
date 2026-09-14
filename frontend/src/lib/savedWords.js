const SAVED_WORDS_KEY = "spellbee.savedWords.v1";

function readSaved() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_WORDS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((word) => typeof word === "string" && word.trim()) : [];
  } catch {
    return [];
  }
}

function writeSaved(words) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(words));
  window.dispatchEvent(new CustomEvent("spellbee:saved-words-changed"));
}

export function getSavedWords() {
  return readSaved();
}

export function isWordSaved(word) {
  const key = String(word || "").toLocaleLowerCase();
  return readSaved().some((item) => item.toLocaleLowerCase() === key);
}

export function saveWord(word) {
  const clean = String(word || "").trim();
  if (!clean) return [];
  const current = readSaved();
  if (current.some((item) => item.toLocaleLowerCase() === clean.toLocaleLowerCase())) return current;
  const next = [clean, ...current].slice(0, 250);
  writeSaved(next);
  return next;
}

export function unsaveWord(word) {
  const key = String(word || "").toLocaleLowerCase();
  const next = readSaved().filter((item) => item.toLocaleLowerCase() !== key);
  writeSaved(next);
  return next;
}

export function toggleSavedWord(word) {
  return isWordSaved(word) ? unsaveWord(word) : saveWord(word);
}
