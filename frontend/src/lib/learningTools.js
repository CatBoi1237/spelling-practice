import { WORD_MAP } from "@/data/words";
import { getSettings, saveSettings, getWordStats, getHistory } from "@/lib/storage";

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function weekStart(date = new Date()) {
  const d = new Date(date); d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}
export function parsePersonalWords(text) {
  return [...new Set(text.toLowerCase().split(/[\s,;]+/).map(w => w.replace(/^[^a-z]+|[^a-z]+$/g, "")).filter(w => /^[a-z]+(?:['-][a-z]+)*$/.test(w)))].slice(0, 50);
}
export function wordObject(word) {
  return WORD_MAP.get(word.toLowerCase()) || { word, difficulty: "custom", definition: "Your custom spelling word.", example: "", spellingTip: "Break the word into smaller chunks and check each one.", patterns: [] };
}
export function redactWord(text, word) {
  return String(text || "").replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "_____ ").trim();
}
export function downloadText(name, content, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows) {
  return rows.map(row => row.map(value => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  }).join(",")).join("\r\n");
}
export function progressCsv() {
  return csv([["Word", "Attempts", "Correct", "Incorrect", "Streak", "Last attempted"], ...Object.entries(getWordStats()).map(([word, s]) => [word, s.attempts, s.correct, s.incorrect, s.streak, s.lastAttempted])]);
}
export function calendarDays(now = new Date()) {
  const counts = {};
  getHistory().forEach(s => {
    const date = new Date(s.date);
    if (!Number.isNaN(date.getTime())) { const key = localDay(date); counts[key] = (counts[key] || 0) + 1; }
  });
  return Array.from({ length: 28 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - 27 + i); const day = localDay(d); return { day, count: counts[day] || 0 }; });
}
export function savePersonalPack(title, text) {
  const words = parsePersonalWords(text);
  if (!title.trim() || words.length < 3) throw new Error("Add a title and at least three different words.");
  const settings = getSettings();
  const pack = { id: crypto.randomUUID(), title: title.trim().slice(0, 80), words, updatedAt: new Date().toISOString() };
  saveSettings({ ...settings, personalPacks: [...(settings.personalPacks || []), pack] });
  return pack;
}
export function wordSearch(words, size = 18) {
  const selected = words.map(w => w.word.toUpperCase()).filter(w => /^[A-Z]+$/.test(w) && w.length <= size).slice(0, 12);
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const placements = [];
  selected.forEach((word, i) => {
    const row = i, col = (i * 3) % (size - word.length + 1);
    [...word].forEach((letter, j) => { grid[row][col + j] = letter; });
    placements.push({ word, row, col });
  });
  grid.forEach((row, r) => row.forEach((cell, c) => { if (!cell) row[c] = String.fromCharCode(65 + ((r * 7 + c * 11 + 3) % 26)); }));
  return { grid, placements };
}
