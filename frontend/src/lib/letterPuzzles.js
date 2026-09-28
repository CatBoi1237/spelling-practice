// Reserve exact matches before assigning remaining copies to misplaced letters.
export function codeFeedback(answer, guess) {
  const feedback = [...guess].map((letter, index) => letter === answer[index] ? 'correct' : 'absent');
  const remaining = {};
  [...answer].forEach((letter, index) => { if (feedback[index] !== 'correct') remaining[letter] = (remaining[letter] || 0) + 1; });
  [...guess].forEach((letter, index) => {
    if (feedback[index] === 'correct' || !remaining[letter]) return;
    feedback[index] = 'misplaced'; remaining[letter]--;
  });
  return feedback;
}

export function hivePoints(word, letters) {
  const pangram = letters.every(letter => word.includes(letter));
  return (word.length === 4 ? 1 : word.length) + (pangram ? 7 : 0);
}

export function checkHiveWord(word, puzzle, found) {
  if (word.length < 4) return 'Use at least four letters.';
  if (!word.includes(puzzle.centre)) return `Include the centre letter ${puzzle.centre.toUpperCase()}.`;
  if ([...word].some(letter => !puzzle.letters.includes(letter))) return 'Use only the seven letters in this hive.';
  if (found.includes(word)) return 'You already found that word.';
  if (!puzzle.words.some(item => item.word === word)) return 'That spelling is not in this hive’s curated word list. Try another word or use a clue.';
  return null;
}
