import { useEffect, useMemo, useRef, useState } from 'react';
import { CODE_GUESSES, CODE_WORDS, HIVES } from '@/data/letterPuzzles';
import { codeFeedback, checkHiveWord, hivePoints } from '@/lib/letterPuzzles';
import { cleanWord } from '@/lib/arcadePuzzles';
import { sampleRound } from '@/lib/arcadeChallenges';
import ArcadeAudio from '@/components/ArcadeAudio';
import { AnswerBox, Message, NextButton } from './GameControls';

const TILE_STYLES = { correct: 'bg-emerald-800 text-white', misplaced: 'bg-amber-300 text-slate-950', absent: 'bg-slate-700 text-white' };
const TILE_LABELS = { correct: 'right place', misplaced: 'different place', absent: 'no remaining match' };
const TILE_SYMBOLS = { correct: '✓', misplaced: '↔', absent: '×' };

export function WordCode({ settings, onFinish }) {
  const puzzle = useMemo(() => sampleRound(CODE_WORDS, 1)[0], []);
  const [guesses, setGuesses] = useState([]), [hint, setHint] = useState(false), [message, setMessage] = useState('');
  const won = guesses.at(-1) === puzzle.word, over = won || guesses.length === 6;
  return <div className="space-y-4">
    <p>Find the five-letter word in six guesses. ✓ means the right place, ↔ means a different place, and × means there is no remaining match for that letter. Repeated letters only receive as many matches as the answer contains.</p>
    <p>Use a word from this puzzle’s starter bank. Invalid or repeated guesses do not use a turn. Letter feedback makes this a puzzle; it does not add spelling mastery.</p>
    <ol aria-label="Guess history" className="space-y-2">{guesses.map((guess, row) => <li key={row} className="grid grid-cols-5 gap-2 max-w-sm">{codeFeedback(puzzle.word, guess).map((status, i) => <span key={i} className={`rounded p-2 text-center font-bold ${TILE_STYLES[status]}`} aria-label={`${guess[i].toUpperCase()}: ${TILE_LABELS[status]}`}><span className="block text-2xl">{guess[i].toUpperCase()}</span><span aria-hidden="true">{TILE_SYMBOLS[status]}</span></span>)}</li>)}</ol>
    <p>{6 - guesses.length} guesses remaining</p>
    <AnswerBox label="Five-letter guess" button="Check guess" maxLength={5} disabled={over} onAnswer={value => {
      const word = cleanWord(value);
      if (over) return;
      if (!/^[a-z]{5}$/.test(word)) { setMessage('Enter exactly five letters.'); return; }
      if (!CODE_GUESSES.includes(word)) { setMessage('That word is not in the starter bank. Check the available guesses below.'); return; }
      if (guesses.includes(word)) { setMessage('You already tried that word.'); return; }
      setGuesses([...guesses, word]);
      setMessage(word === puzzle.word ? 'Code solved!' : codeFeedback(puzzle.word, word).map((status, i) => `${word[i].toUpperCase()}: ${TILE_LABELS[status]}`).join('. '));
    }} />
    {!over && <button className="tool-button" disabled={hint} onClick={() => setHint(true)}>Show meaning clue</button>}
    {hint && <p>Clue: {puzzle.clue}</p>}
    <Message>{over ? `${won ? 'Solved!' : 'Out of guesses.'} The word is ${puzzle.word}. ${puzzle.clue}` : message}</Message>
    <details><summary>Available guesses</summary><p className="mt-2">{[...CODE_GUESSES].sort().join(', ')}</p></details>
    {over && <><ArcadeAudio text={puzzle.word} settings={settings} /><NextButton onClick={() => onFinish([{ word: puzzle.word, right: won, points: won ? (7 - guesses.length) * 100 : 0 }])}>Finish word code</NextButton></>}
  </div>;
}

export function LetterHive({ onFinish }) {
  const puzzle = useMemo(() => sampleRound(HIVES, 1)[0], []);
  const [outer, setOuter] = useState(puzzle.letters.filter(letter => letter !== puzzle.centre));
  const [answer, setAnswer] = useState(''), [found, setFound] = useState([]), [message, setMessage] = useState(''), [hint, setHint] = useState(null);
  const input = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);
  const total = puzzle.words.reduce((sum, item) => sum + hivePoints(item.word, puzzle.letters), 0);
  const score = found.reduce((sum, word) => sum + hivePoints(word, puzzle.letters), 0);
  const submit = event => {
    event.preventDefault(); const word = cleanWord(answer), error = checkHiveWord(word, puzzle, found);
    if (error) { setMessage(error); return; }
    const points = hivePoints(word, puzzle.letters), pangram = puzzle.letters.every(letter => word.includes(letter));
    setFound([...found, word]); setAnswer(''); setHint(null);
    setMessage(`${word}: ${puzzle.words.find(item => item.word === word).clue} +${points} points.${pangram ? ' Pangram! You used all seven letters.' : ''}`); input.current?.focus();
  };
  const addLetter = letter => { setAnswer(value => value.length < 30 ? value + letter : value); input.current?.focus(); };
  return <div className="space-y-4">
    <p>Build words of at least four letters. Every word must contain <strong>{puzzle.centre.toUpperCase()}</strong>, the centre letter. Letters can be reused. This hive has {puzzle.words.length} words in its curated bank, with meaning clues available.</p>
    <p>Four-letter words earn 1 point; longer words earn their length. Use all seven different letters for a 7-point pangram bonus. No timer. Game points are saved without changing spelling mastery.</p>
    <div className="flex flex-col items-center gap-2 max-w-sm" aria-label="Hive letters"><div className="flex gap-2">{outer.slice(0, 3).map(letter => <button key={letter} className="tool-button text-xl" aria-label={`Add ${letter.toUpperCase()}`} onClick={() => addLetter(letter)}>{letter.toUpperCase()}</button>)}</div>
      <button className="tool-button bg-amber-300 text-slate-950 text-2xl" aria-label={`Add required centre letter ${puzzle.centre.toUpperCase()}`} onClick={() => addLetter(puzzle.centre)}>{puzzle.centre.toUpperCase()} ★</button>
      <div className="flex gap-2">{outer.slice(3).map(letter => <button key={letter} className="tool-button text-xl" aria-label={`Add ${letter.toUpperCase()}`} onClick={() => addLetter(letter)}>{letter.toUpperCase()}</button>)}</div></div>
    <form className="space-y-3" onSubmit={submit}><label className="block">Hive word<input ref={input} className="tool-input block w-full" value={answer} onChange={event => setAnswer(event.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={30} /></label><button className="tool-button" disabled={!answer.trim()}>Submit word</button><button type="button" className="tool-button" onClick={() => { setAnswer(''); input.current?.focus(); }}>Clear</button></form>
    <div className="flex flex-wrap gap-2"><button className="tool-button" onClick={() => setOuter(sampleRound(outer, outer.length))}>Shuffle letters</button><button className="tool-button" disabled={found.length === puzzle.words.length} onClick={() => setHint(puzzle.words.find(item => !found.includes(item.word)))}>Give me a clue</button></div>
    {hint && <p>Clue: {hint.clue} ({hint.word.length} letters, starts with {hint.word[0].toUpperCase()})</p>}
    <Message>{message}</Message><p>{score}/{total} points · {found.length}/{puzzle.words.length} words found</p><p>{found.join(', ') || 'No words found yet.'}</p>
    <button className="tool-button" onClick={() => onFinish(puzzle.words.map(item => ({ word: `${item.word} — ${item.clue}`, right: found.includes(item.word), points: found.includes(item.word) ? hivePoints(item.word, puzzle.letters) : 0 })))}>Finish and review hive</button>
  </div>;
}
