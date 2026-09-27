export const cleanWord = value => String(value).trim().toLowerCase();
export const oneLetterApart = (a, b) => a.length === b.length && [...a].filter((letter, i) => letter !== b[i]).length === 1;

export function ladderRoute(start, goal, words) {
  const queue = [[start]], visited = new Set([start]);
  for (let i = 0; i < queue.length; i++) {
    const route = queue[i], last = route[route.length - 1];
    if (last === goal) return route;
    for (const word of words) {
      if (!visited.has(word) && oneLetterApart(last, word)) {
        visited.add(word); queue.push([...route, word]);
      }
    }
  }
  return null;
}

// Search each neighbour; a tile may appear only once in a word's path.
export function gridPath(letters, word, size = 4) {
  if (!word || letters.length !== size * size) return null;
  function visit(cell, index, path) {
    if (letters[cell] !== word[index] || path.includes(cell)) return null;
    const next = [...path, cell];
    if (index === word.length - 1) return next;
    const row = Math.floor(cell / size), col = cell % size;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr, c = col + dc;
      if ((!dr && !dc) || r < 0 || r >= size || c < 0 || c >= size) continue;
      const result = visit(r * size + c, index + 1, next);
      if (result) return result;
    }
    return null;
  }
  for (let cell = 0; cell < letters.length; cell++) {
    const result = visit(cell, 0, []);
    if (result) return result;
  }
  return null;
}

export function bingoLine(marked, size = 3) {
  const lines = [];
  for (let i = 0; i < size; i++) {
    lines.push(Array.from({ length: size }, (_, j) => i * size + j));
    lines.push(Array.from({ length: size }, (_, j) => j * size + i));
  }
  lines.push(Array.from({ length: size }, (_, i) => i * size + i));
  lines.push(Array.from({ length: size }, (_, i) => i * size + size - 1 - i));
  return lines.find(line => line.every(cell => marked.includes(cell))) || null;
}

export function searchSelection(placements, start, end, size) {
  return placements.find(p => {
    const first = p.row * size + p.col;
    const last = (p.row + p.dr * (p.word.length - 1)) * size + p.col + p.dc * (p.word.length - 1);
    return (start === first && end === last) || (start === last && end === first);
  });
}

export function hangmanState(word, guessed) {
  const misses = guessed.filter(letter => !word.includes(letter));
  const won = [...word].every(letter => guessed.includes(letter));
  return { misses, won, over: won || misses.length >= 6 };
}
