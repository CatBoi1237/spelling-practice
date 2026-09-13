// Word helpers: syllables, vowels, hints (never reveal the whole word).

export function estimateSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  let count = (w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g) || []).length;
  return Math.max(1, count);
}

export function syllableCount(word) {
  return word.syllables || estimateSyllables(word.word);
}

export function vowelCount(text) {
  return (text.toLowerCase().match(/[aeiou]/g) || []).length;
}

export function maskWord(sentence, word) {
  return sentence.replace(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "_____");
}

// Ordered hint ladder — cheap hints first, most revealing last.
export function buildHints(word) {
  const w = word.word;
  const hints = [
    { id: "syllables", label: "Syllables", text: `This word has ${syllableCount(word)} syllable${syllableCount(word) === 1 ? "" : "s"}${word.syllableBreak ? "" : "."}`, cost: 10 },
    { id: "length", label: "Length", text: `It has ${w.length} letters and ${vowelCount(w)} vowels.`, cost: 10 },
  ];
  if (word.origin) hints.push({ id: "origin", label: "Origin", text: `Origin: ${word.origin}${word.originNote ? ` — ${word.originNote}` : ""}.`, cost: 10 });
  if (word.partOfSpeech) hints.push({ id: "pos", label: "Word type", text: `It is a${/^[aeiou]/i.test(word.partOfSpeech) ? "n" : ""} ${word.partOfSpeech}.`, cost: 5 });
  if (word.spellingTip) hints.push({ id: "tip", label: "Spelling rule", text: word.spellingTip, cost: 20 });
  hints.push({ id: "first", label: "First letter", text: `It starts with “${w[0].toUpperCase()}”.`, cost: 25 });
  hints.push({ id: "last", label: "Last letter", text: `It ends with “${w[w.length - 1]}”.`, cost: 25 });
  return hints;
}

export function diffChars(user, correct) {
  const out = [];
  const max = Math.max(user.length, correct.length);
  for (let i = 0; i < max; i++) {
    const c = correct[i] ?? "";
    const u = user[i] ?? "";
    out.push({ char: c || "·", user: u || "·", ok: c === u && c !== "" });
  }
  return out;
}

export function normalize(s) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}
