// Stable clues do not jump around while the learner types.
export function scrambleWord(word) {
  const letters = [...word];
  for (let i = letters.length - 1; i > 0; i--) {
    const j = (word.charCodeAt(i) + i * 7) % (i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  if (letters.join('') === word) {
    const different = letters.findIndex(letter => letter !== letters[0]);
    if (different > 0) [letters[0], letters[different]] = [letters[different], letters[0]];
  }
  return letters.join('');
}

export function missingLetters(word) {
  return [...word].map((letter, i) => /[a-z]/i.test(letter) && i % 2 === 1 ? '_' : letter).join(' ');
}

export function spellingSeconds(start, end = Date.now()) {
  return Math.max(0.1, (end - start) / 1000);
}
