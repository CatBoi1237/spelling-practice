import { useEffect, useMemo, useRef, useState } from 'react';
import ArcadeAudio from '@/components/ArcadeAudio';
import { sampleRound } from '@/lib/arcadeChallenges';
import { cleanWord, hangmanState } from '@/lib/arcadePuzzles';
import { redactWord } from '@/lib/learningTools';
import { cancelSpeech } from '@/lib/speech';
import { AnswerBox, Message, NextButton } from './GameControls';

export function Hangman({ words, settings, onFinish }) {
  const bank = useMemo(() => sampleRound(words, 5), [words]);
  const [index, setIndex] = useState(0), [guessed, setGuessed] = useState([]), [rows, setRows] = useState([]), [message, setMessage] = useState('');
  const word = bank[index], { misses, won, over } = hangmanState(word.word, guessed);
  const guess = value => {
    const letter = cleanWord(value);
    if (over) return;
    if (!/^[a-z]$/.test(letter)) { setMessage('Enter one letter from A to Z.'); return; }
    if (guessed.includes(letter)) { setMessage(`You already tried ${letter.toUpperCase()}.`); return; }
    setGuessed(current => current.includes(letter) ? current : [...current, letter]);
    setMessage(word.word.includes(letter) ? `${letter.toUpperCase()} is in the word.` : `${letter.toUpperCase()} is not in the word.`);
  };
  return <div className="space-y-4">
    <p>Word {index + 1}/{bank.length}. Guess letters using the clue. Six different misses complete the drawing.</p>
    <p>{redactWord(word.definition, word.word)}</p>
    <svg viewBox="0 0 200 160" className="h-40 w-48" role="img" aria-label={`${misses.length} of 6 drawing parts completed`} fill="none" stroke="currentColor" strokeWidth="4">
      <path d="M15 150H150M40 150V10H120V30" />
      {misses.length >= 1 && <circle cx="120" cy="45" r="15" />}
      {misses.length >= 2 && <path d="M120 60V105" />}
      {misses.length >= 3 && <path d="M120 70L95 90" />}
      {misses.length >= 4 && <path d="M120 70L145 90" />}
      {misses.length >= 5 && <path d="M120 105L100 135" />}
      {misses.length >= 6 && <path d="M120 105L140 135" />}
    </svg>
    <p className="break-words text-3xl font-mono tracking-widest" aria-label={`Word: ${[...word.word].map(letter => over || guessed.includes(letter) ? letter : 'blank').join(' ')}`}>{[...word.word].map(letter => over || guessed.includes(letter) ? letter.toUpperCase() : '_').join(' ')}</p>
    <p>{6 - misses.length} misses remaining · Missed letters: {misses.join(', ').toUpperCase() || 'none'}</p>
    <AnswerBox label="Guess a letter" button="Guess letter" maxLength={1} disabled={over} focusKey={index} onAnswer={guess} />
    <div className="flex flex-wrap gap-2" aria-label="Letter keyboard">{[...'abcdefghijklmnopqrstuvwxyz'].map(letter => <button key={letter} className="tool-button" disabled={over || guessed.includes(letter)} onClick={() => guess(letter)} aria-label={`Guess ${letter.toUpperCase()}`}>{letter.toUpperCase()}</button>)}</div>
    <Message>{over ? `${won ? 'Solved!' : 'Keep practising.'} The word is ${word.word}. ${word.spellingTip || ''}` : message}</Message>
    {over && <><ArcadeAudio text={word.word} settings={settings} /><NextButton onClick={() => {
      const next = [...rows, { word: word.word, right: won }];
      if (index + 1 === bank.length) onFinish(next);
      else { cancelSpeech(); setRows(next); setIndex(index + 1); setGuessed([]); setMessage(''); }
    }}>{index + 1 === bank.length ? 'Finish round' : 'Next word'}</NextButton></>}
  </div>;
}

export function GuessWord({ words, settings, onFinish }) {
  const bank = useMemo(() => sampleRound(words, 5), [words]);
  const [index, setIndex] = useState(0), [clues, setClues] = useState(1), [result, setResult] = useState(null), [rows, setRows] = useState([]);
  const word = bank[index];
  return <div className="space-y-4">
    <p>Word {index + 1}/{bank.length}. Start with the meaning clue. Each extra clue lowers this word's points: 300, 200, then 100.</p>
    <ol className="list-decimal pl-6 space-y-2"><li>{redactWord(word.definition, word.word)}</li>{clues >= 2 && <li>{word.word.length} letters. {redactWord(word.example || '', word.word)}</li>}{clues >= 3 && <li>Starts with {word.word[0].toUpperCase()} and ends with {word.word.at(-1).toUpperCase()}.</li>}</ol>
    {result === null && clues < 3 && <button className="tool-button" onClick={() => setClues(n => n + 1)}>Reveal another clue</button>}
    <AnswerBox focusKey={index} disabled={result !== null} onAnswer={answer => {
      if (result !== null) return;
      const right = cleanWord(answer) === word.word;
      setRows(current => [...current, { word: word.word, right, points: right ? (4 - clues) * 100 : 0, spelling: true }]); setResult(right);
    }} />
    {result !== null && <><Message>{result ? 'Correct!' : `The spelling is ${word.word}.`} {word.spellingTip}</Message><ArcadeAudio text={word.word} settings={settings} /><NextButton onClick={() => {
      if (index + 1 === bank.length) onFinish(rows);
      else { cancelSpeech(); setIndex(index + 1); setClues(1); setResult(null); }
    }}>{index + 1 === bank.length ? 'Finish round' : 'Next word'}</NextButton></>}
  </div>;
}

export function BeatClock({ words, settings, onFinish }) {
  const bank = useMemo(() => sampleRound(words, words.length), [words]);
  const [deadline, setDeadline] = useState(null), [seconds, setSeconds] = useState(60), [index, setIndex] = useState(0), [message, setMessage] = useState('');
  const rows = useRef([]), ended = useRef(false), currentIndex = useRef(0);
  const finish = () => { if (!ended.current) { ended.current = true; cancelSpeech(); onFinish(rows.current); } };
  const finishRef = useRef(finish); finishRef.current = finish;
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(left); if (!left) finishRef.current();
    };
    tick(); const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [deadline]);
  const answer = (text, skipped = false) => {
    if (!deadline || ended.current) return;
    if (Date.now() >= deadline) { finish(); return; }
    // Ignore a second activation from the same rendered question.
    if (currentIndex.current !== index) return;
    const word = bank[index], right = !skipped && cleanWord(text) === word.word;
    rows.current.push({ word: word.word, right, spelling: !skipped }); currentIndex.current++;
    setMessage(right ? `Correct: ${word.word}.` : `${skipped ? 'Skipped' : 'Correction'}: ${word.word}.`);
    cancelSpeech();
    if (index + 1 === bank.length) finish(); else setIndex(index + 1);
  };
  if (!deadline) return <div className="space-y-4"><p>Spell as many words as you can in 60 seconds. Each word has audio and a meaning clue. Skip any word; corrections appear after each answer and in your results.</p><p>The timer keeps running if you switch tabs. Leaving this game discards an unfinished round.</p><NextButton onClick={() => setDeadline(Date.now() + 60000)}>Start one-minute round</NextButton></div>;
  return <div className="space-y-4">
    <p role="timer" aria-label="Seconds remaining" className="text-3xl font-bold">{seconds}s</p><p>{rows.current.filter(row => row.right).length} correct</p>
    <Message>{message}</Message><p>{redactWord(bank[index].definition, bank[index].word)}</p>
    <ArcadeAudio key={index} text={bank[index].word} settings={settings} autoPlay={settings.autoPlay !== false} />
    <AnswerBox focusKey={index} onAnswer={answer} />
    <button className="tool-button" onClick={() => answer('', true)}>Skip word</button><button className="tool-button" onClick={finish}>Finish early</button>
  </div>;
}
