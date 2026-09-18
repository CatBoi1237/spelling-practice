import { WORD_MAP } from "@/data/words";
import { getSettings, saveSettings, getWordStats, getHistory, getPracticeDays } from "@/lib/storage";

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function weekStart(date = new Date()) {
  const d = new Date(date); d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}
export function parsePersonalWords(text, limit = 50) {
  return [...new Set(text.toLowerCase().split(/[\s,;]+/).map(w => w.replace(/^[^a-z]+|[^a-z]+$/g, "")).filter(w => /^[a-z]+(?:['-][a-z]+)*$/.test(w)))].slice(0, limit);
}
export function validatePersonalPack(title, text) {
  if (typeof title !== "string" || typeof text !== "string") throw new Error("A pack needs a title and spelling words.");
  const words = parsePersonalWords(text, 51);
  if (!title.trim() || words.length < 3) throw new Error("Add a title and at least three different words.");
  if (words.length > 50) throw new Error("A pack can contain up to 50 unique words. Split this list into smaller packs.");
  if (words.some(w => w.length > 60)) throw new Error("Each spelling word must be 60 letters or fewer.");
  return { title: title.trim().slice(0, 80), words };
}
export function importPersonalPack(json) {
  let pack;
  try { pack = JSON.parse(json); } catch { throw new Error("Choose a valid SpellBee JSON pack file."); }
  if (pack?.format !== "spellbee-pack" || pack.version !== 1 || !Array.isArray(pack.words) || pack.words.length > 50 || !pack.words.every(w => typeof w === "string" && /^[a-z]+(?:['-][a-z]+)*$/i.test(w))) throw new Error("This file is not a supported SpellBee word pack.");
  return validatePersonalPack(pack.title, pack.words.join("\n"));
}
export function completedQuestRound({ mode, topic, focus, total, queueLength }) {
  return mode === "topic" && Boolean(topic) && !focus && queueLength > 0 && total >= queueLength;
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
export function sessionsCsv(history = getHistory()) {
  return csv([["Date", "Mode", "Difficulty", "Correct", "Incorrect", "Accuracy (%)", "Points", "Average seconds per answer"], ...history.map(s => {
    const correct = Number(s.correct) || 0, incorrect = Number(s.incorrect) || 0;
    return [s.date, s.modeLabel || s.mode, s.difficulty, correct, incorrect, correct + incorrect ? Math.round(correct / (correct + incorrect) * 100) : 0, s.points || 0, Number.isFinite(s.avgTime) ? s.avgTime.toFixed(2) : ""];
  })]);
}
export function sentencesCsv(journal = getSettings().sentenceJournal || []) {
  return csv([["Date", "Word", "Sentence"], ...journal.map(s => [s.date, s.word, s.sentence])]);
}
export function calendarDays(now = new Date()) {
  const counts = {};
  const practiced = new Set(getPracticeDays());
  getHistory().forEach(s => {
    const date = new Date(s.date);
    if (!Number.isNaN(date.getTime())) { const key = localDay(date); counts[key] = (counts[key] || 0) + 1; }
  });
  return Array.from({ length: 28 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - 27 + i); const day = localDay(d); return { day, count: counts[day] || 0, practiced: practiced.has(day) }; });
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
  const selected = [...new Set(words.map(w => w.word.toUpperCase()))].filter(w => /^[A-Z]+$/.test(w) && w.length <= size).slice(0, Math.min(12, size));
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const placements = [];
  const directions = [[0, 1, "right"], [1, 0, "down"], [1, 1, "diagonally down-right"], [0, -1, "left"], [-1, 0, "up"], [-1, -1, "diagonally up-left"]];
  selected.forEach((word, i) => {
    for (let d = 0; d < directions.length; d++) {
      const [dr, dc, direction] = directions[(i + d) % directions.length];
      for (let n = 0; n < size * size; n++) {
        const cell = (n + i * 37) % (size * size), row = Math.floor(cell / size), col = cell % size;
        const fits = [...word].every((letter, j) => {
          const r = row + dr * j, c = col + dc * j;
          return r >= 0 && r < size && c >= 0 && c < size && (!grid[r][c] || grid[r][c] === letter);
        });
        if (!fits) continue;
        [...word].forEach((letter, j) => { grid[row + dr * j][col + dc * j] = letter; });
        placements.push({ word, row, col, dr, dc, direction });
        return;
      }
    }
  });
  grid.forEach((row, r) => row.forEach((cell, c) => { if (!cell) row[c] = String.fromCharCode(65 + ((r * 7 + c * 11 + 3) % 26)); }));
  return { grid, placements };
}
