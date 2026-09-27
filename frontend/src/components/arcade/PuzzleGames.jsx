import { useMemo, useState } from 'react';
import ArcadeAudio from '@/components/ArcadeAudio';
import { sampleRound } from '@/lib/arcadeChallenges';
import { bingoLine, cleanWord, gridPath, ladderRoute, oneLetterApart, searchSelection } from '@/lib/arcadePuzzles';
import { redactWord, wordSearch } from '@/lib/learningTools';
import { cancelSpeech } from '@/lib/speech';
import { CATEGORY_ROUNDS, GRID_LETTERS, GRID_WORDS, LADDERS, LADDER_WORDS, RHYMES } from '@/data/arcadePuzzles';
import { AnswerBox, Message, NextButton } from './GameControls';

export function WordLadder({ onFinish }) {
  const puzzle = useMemo(() => sampleRound(LADDERS, 1)[0], []);
  const [path, setPath] = useState([puzzle[0]]), [message, setMessage] = useState(''), [hints, setHints] = useState(0);
  const goal = puzzle.at(-1), current = path.at(-1), solved = current === goal;
  return <div className="space-y-4">
    <p>Turn <strong>{puzzle[0].toUpperCase()}</strong> into <strong>{goal.toUpperCase()}</strong>. Change exactly one letter each move. No rearranging, adding or removing letters.</p>
    <p>This puzzle uses a small word bank, shown below. You can use any valid route. Hints show a next step without adding it for you.</p>
    <p className="text-2xl font-bold break-words" aria-label="Your ladder">{path.join(' → ').toUpperCase()}</p>
    <AnswerBox label="Next word" button="Add step" disabled={solved} maxLength={current.length} focusKey={path.length} onAnswer={value => {
      const word = cleanWord(value);
      if (!oneLetterApart(current, word)) { setMessage('Change exactly one letter.'); return; }
      if (!LADDER_WORDS.includes(word)) { setMessage('That word is not in this puzzle bank. Check the available words below.'); return; }
      if (path.includes(word)) { setMessage('You have used that word. Undo a step to try another route.'); return; }
      setPath([...path, word]); setMessage(word === goal ? 'You connected the words!' : 'Valid step.');
    }} />
    <Message>{message}</Message>
    {!solved && <div className="flex gap-2"><button className="tool-button" disabled={path.length === 1} onClick={() => { setPath(path.slice(0, -1)); setMessage('Step undone.'); }}>Undo step</button><button className="tool-button" onClick={() => {
      const route = ladderRoute(current, goal, LADDER_WORDS.filter(word => !path.slice(0, -1).includes(word)));
      setHints(hints + 1); setMessage(route ? `Try ${route[1].toUpperCase()} next. What changed?` : 'Undo a step to open a route to the goal.');
    }}>Hint</button></div>}
    <p>{path.length - 1} steps · {hints} hints</p>
    <details><summary>Available {current.length}-letter words</summary><p className="mt-2">{LADDER_WORDS.filter(word => word.length === current.length).sort().join(', ')}</p></details>
    {solved ? <NextButton onClick={() => onFinish([{ word: path.join(' → '), right: true }])}>Finish ladder</NextButton> : <button className="tool-button" onClick={() => onFinish([{ word: puzzle.join(' → '), right: false }])}>Show a solution and finish</button>}
  </div>;
}

export function LetterGrid({ onFinish }) {
  const letters = useMemo(() => {
    // Rotations retain the same paths while changing their positions.
    let board = [...GRID_LETTERS];
    for (let turns = Math.floor(Math.random() * 4); turns > 0; turns--) board = board.map((_, i) => board[(3 - i % 4) * 4 + Math.floor(i / 4)]);
    return board;
  }, []);
  const solutions = useMemo(() => GRID_WORDS.filter(word => word.length >= 3 && gridPath(letters, word)), [letters]);
  const [found, setFound] = useState([]), [message, setMessage] = useState(''), [highlight, setHighlight] = useState([]);
  return <div className="space-y-4">
    <p>Find words of at least three letters. Move horizontally, vertically or diagonally between neighbours. A tile cannot be reused within one word. Type the complete word below.</p>
    <p>This starter board accepts {solutions.length} words from its curated bank. There is no time limit.</p>
    <div className="grid grid-cols-4 gap-2 max-w-xs" aria-label="Letter grid">{letters.map((letter, i) => <span key={i} className={`rounded-lg border-2 p-3 text-center text-2xl font-bold ${highlight.includes(i) ? 'bg-amber-200 text-slate-950 border-amber-600' : 'border-slate-400'}`} aria-label={`Row ${Math.floor(i / 4) + 1}, column ${i % 4 + 1}: ${letter}`}>{letter.toUpperCase()}</span>)}</div>
    <AnswerBox button="Find word" onAnswer={value => {
      const word = cleanWord(value);
      if (found.includes(word)) { setMessage('You already found that word.'); return; }
      if (!solutions.includes(word)) { setMessage('No match in this board’s word bank. Use at least three connected letters without reusing a tile.'); return; }
      setHighlight(gridPath(letters, word)); setFound([...found, word]); setMessage(`Found ${word}! Its path is highlighted.`);
    }} />
    <Message>{message}</Message><p>{found.length}/{solutions.length} found: {found.join(', ') || 'none yet'}</p>
    <button className="tool-button" onClick={() => onFinish(solutions.map(word => ({ word, right: found.includes(word) })))}>Finish and reveal remaining words</button>
  </div>;
}

export function Categories({ onFinish }) {
  const puzzle = useMemo(() => sampleRound(CATEGORY_ROUNDS, 1)[0], []);
  const [answers, setAnswers] = useState({}), [accepted, setAccepted] = useState({}), [message, setMessage] = useState('');
  const groups = Object.keys(puzzle.groups);
  return <div className="space-y-4">
    <p className="text-2xl font-bold">Starting letter: {puzzle.letter.toUpperCase()}</p>
    <p>Spell one animal, food and place beginning with this letter. This untimed starter round uses a curated answer list; a word outside the list is not necessarily wrong. Place names ignore capitals.</p>
    <form className="space-y-4" onSubmit={event => {
      event.preventDefault(); const next = { ...accepted }, notices = [];
      for (const group of groups) {
        if (next[group]) continue;
        const word = cleanWord(answers[group] || '');
        if (puzzle.groups[group].includes(word)) next[group] = word;
        else notices.push(`${group}: ${word.startsWith(puzzle.letter) ? 'not in this round’s list; try another word' : `start with ${puzzle.letter.toUpperCase()}`}.`);
      }
      setAccepted(next); setMessage(notices.join(' ') || 'All three categories solved!');
    }}>
      {groups.map(group => <label key={group} className="block">{group}{accepted[group] ? ` — accepted: ${accepted[group]}` : ''}<input className="tool-input block w-full" value={answers[group] || ''} disabled={Boolean(accepted[group])} autoComplete="off" spellCheck={false} maxLength={40} onChange={event => setAnswers({ ...answers, [group]: event.target.value })} /></label>)}
      <button className="tool-button" disabled={Object.keys(accepted).length === groups.length}>Check categories</button>
    </form>
    <Message>{message}</Message>
    <button className="tool-button" onClick={() => onFinish(groups.map(group => ({ word: `${group}: ${accepted[group] || puzzle.groups[group].join(', ')}`, right: Boolean(accepted[group]) })))}>Finish and see examples</button>
  </div>;
}

export function RhymeTime({ onFinish, settings }) {
  const bank = useMemo(() => sampleRound(RHYMES, 5), []);
  const [index, setIndex] = useState(0), [result, setResult] = useState(null), [rows, setRows] = useState([]);
  const item = bank[index];
  return <div className="space-y-4"><p>Word {index + 1}/{bank.length}. Match both the rhyme and the meaning clue.</p>
    <p className="text-2xl">Rhymes with <strong>{item.cue}</strong></p><p>{item.clue} ({item.word.length} letters)</p>
    <ArcadeAudio text={item.cue} settings={settings} label="Hear rhyme cue" />
    <AnswerBox focusKey={index} disabled={result !== null} onAnswer={value => {
      if (result !== null) return;
      const right = cleanWord(value) === item.word; setResult(right); setRows([...rows, { word: item.word, right, spelling: true }]);
    }} />
    {result !== null && <><Message>{result ? 'Correct!' : `The answer is ${item.word}.`} {item.cue} and {item.word} have matching end sounds.</Message><ArcadeAudio text={`${item.cue}, ${item.word}`} settings={settings} label="Hear rhyming pair" /><NextButton onClick={() => {
      if (index + 1 === bank.length) onFinish(rows); else { cancelSpeech(); setIndex(index + 1); setResult(null); }
    }}>{index + 1 === bank.length ? 'Finish round' : 'Next rhyme'}</NextButton></>}
  </div>;
}

export function WordBingo({ words, settings, onFinish }) {
  const card = useMemo(() => sampleRound(words, 9), [words]);
  const calls = useMemo(() => sampleRound(card, card.length), [card]);
  const [index, setIndex] = useState(0), [marked, setMarked] = useState([]), [message, setMessage] = useState(''), [rows, setRows] = useState([]), [answered, setAnswered] = useState(false);
  const won = bingoLine(marked), call = calls[index];
  if (card.length < 9) return <p>This level needs at least nine words for Bingo. Choose another level from the arcade.</p>;
  return <div className="space-y-4"><p>Listen to the word or read its meaning clue, then mark it on your card. Make a row, column or diagonal of three. Incorrect clicks do not mark a square.</p>
    <p>Call {index + 1}/{calls.length}: {redactWord(call.definition, call.word)}</p><ArcadeAudio key={index} text={call.word} settings={settings} />
    <div className="grid grid-cols-3 gap-2" aria-label="Bingo card">{card.map((word, cell) => <button key={word.word} className={`tool-button break-words min-w-0 ${marked.includes(cell) ? 'ring-4 ring-emerald-500' : ''}`} aria-pressed={marked.includes(cell)} disabled={marked.includes(cell) || answered || Boolean(won)} onClick={() => {
      if (word.word !== call.word) { setMessage('That is not this call. Listen again or use the clue.'); return; }
      setMarked([...marked, cell]); setRows([...rows, { word: word.word, right: true }]); setAnswered(true); setMessage(`Marked ${word.word}.`);
    }}>{marked.includes(cell) ? '✓ ' : ''}{word.word}</button>)}</div>
    <Message>{won ? 'Bingo! Three in a line.' : message}</Message>
    {won || index + 1 === calls.length && answered ? <NextButton onClick={() => onFinish(rows)}>Finish bingo</NextButton> : answered ? <NextButton onClick={() => { cancelSpeech(); setIndex(index + 1); setAnswered(false); setMessage(''); }}>Next call</NextButton> : <button className="tool-button" onClick={() => {
      const next = [...rows, { word: call.word, right: false }];
      if (index + 1 === calls.length) onFinish(next); else { cancelSpeech(); setRows(next); setIndex(index + 1); setMessage(`Skipped ${call.word}.`); }
    }}>Skip call</button>}
  </div>;
}

export function InteractiveSearch({ words, onFinish }) {
  const size = 10;
  const puzzle = useMemo(() => wordSearch(sampleRound(words.filter(word => word.word.length <= size), 6), size), [words]);
  const [start, setStart] = useState(null), [selected, setSelected] = useState(null), [found, setFound] = useState([]), [rows, setRows] = useState([]), [message, setMessage] = useState('');
  const complete = found.length === puzzle.placements.length;
  const choose = cell => {
    if (start === null) { setStart(cell); setMessage('Now choose the other end of the word.'); return; }
    const match = searchSelection(puzzle.placements, start, cell, size); setStart(null);
    if (!match || found.includes(match.word)) { setMessage('Those ends do not match an unfound target word. Try again.'); return; }
    setSelected(match.word); setMessage('Grid covered. Spell the word you just found.');
  };
  if (!puzzle.placements.length) return <p>No words at this level fit the grid. Choose another word level.</p>;
  return <div className="space-y-4"><p>Select the first and last tiles of a target word. Words can run across, down, diagonally or backwards. Then spell it with the grid covered.</p>
    {!selected && <><p>Targets: {puzzle.placements.map(p => `${found.includes(p.word) ? '✓ ' : ''}${p.word}`).join(' · ')}</p>
      <div className="grid gap-1 max-w-lg" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }} aria-label="Word search grid">{puzzle.grid.flat().map((letter, cell) => <button key={cell} className={`aspect-square rounded border font-bold focus:outline focus:outline-2 ${start === cell ? 'bg-amber-200 text-slate-950' : 'border-slate-400'}`} disabled={complete} aria-pressed={start === cell} aria-label={`Row ${Math.floor(cell / size) + 1}, column ${cell % size + 1}: ${letter}`} onClick={() => choose(cell)}>{letter}</button>)}</div>
      {start !== null && <button className="tool-button" onClick={() => { setStart(null); setMessage('Selection cleared.'); }}>Clear selection</button>}</>}
    <Message>{message}</Message>
    {selected && <AnswerBox onAnswer={value => {
      const right = cleanWord(value) === selected.toLowerCase();
      setRows([...rows, { word: selected.toLowerCase(), right }]); setFound([...found, selected]); setSelected(null);
      setMessage(right ? 'Correct spelling!' : `The spelling is ${selected.toLowerCase()}. Read it carefully before finding another word.`);
    }} />}
    {!selected && <p>{found.length}/{puzzle.placements.length} words found</p>}
    {!selected && <button className="tool-button" onClick={() => onFinish([...rows, ...puzzle.placements.filter(p => !found.includes(p.word)).map(p => ({ word: p.word.toLowerCase(), right: false }))])}>{complete ? 'Finish word search' : 'Finish and reveal answers'}</button>}
  </div>;
}
