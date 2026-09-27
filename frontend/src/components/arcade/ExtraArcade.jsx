import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { DIFFICULTY_META, WORDS_BY_DIFFICULTY } from '@/data/words';
import { EXTRA_GAMES } from '@/data/arcadePuzzles';
import { appendHistory, recordWordAttempt, getArcadeRecords } from '@/lib/storage';
import { cancelSpeech } from '@/lib/speech';
import { BeatClock, GuessWord, Hangman } from './SoloWordGames';
import { Categories, InteractiveSearch, LetterGrid, RhymeTime, WordBingo, WordLadder } from './PuzzleGames';
import { SpellingRelay, SpokenBee } from './PartyGames';

const COMPONENTS = { hangman: Hangman, ladder: WordLadder, grid: LetterGrid, categories: Categories, bingo: WordBingo, rhyme: RhymeTime, search: InteractiveSearch, clock: BeatClock, clues: GuessWord, bee: SpokenBee, relay: SpellingRelay };

export default function ExtraArcade({ game, level, onReplay }) {
  const { settings, updateStats, refresh } = useApp();
  const meta = EXTRA_GAMES.find(item => item.id === game), Game = COMPONENTS[game];
  const difficulty = meta.level ? (DIFFICULTY_META[level] ? level : 'grade5') : 'mixed';
  const words = useMemo(() => (WORDS_BY_DIFFICULTY[level] || WORDS_BY_DIFFICULTY.grade5).filter(word => /^[a-z]+$/.test(word.word)), [level]);
  const [results, setResults] = useState(null);
  const finished = useRef(false), heading = useRef(null);
  const best = useMemo(() => getArcadeRecords()[`arcade-${game}:${difficulty}`]?.points || 0, [game, difficulty]);
  useEffect(() => () => cancelSpeech(), []);
  useEffect(() => { if (results) heading.current?.focus(); }, [results]);
  const finish = useCallback(rows => {
    if (finished.current) return; finished.current = true; cancelSpeech();
    if (!meta.party && rows.length) {
      const correct = rows.filter(row => row.right).length, points = rows.reduce((total, row) => total + (row.points ?? (row.right ? 100 : 0)), 0);
      rows.filter(row => row.spelling).forEach(row => recordWordAttempt(row.word, row.right));
      appendHistory({ date: new Date().toISOString(), mode: `arcade-${game}`, modeLabel: meta.title, difficulty, correct, incorrect: rows.length - correct, total: rows.length, points, accuracy: Math.round(correct / rows.length * 100) });
      updateStats(previous => ({ ...previous, sessions: previous.sessions + 1, totalPoints: previous.totalPoints + points,
        totalAttempted: previous.totalAttempted + rows.filter(row => row.spelling).length,
        totalCorrect: previous.totalCorrect + rows.filter(row => row.spelling && row.right).length,
        totalIncorrect: previous.totalIncorrect + rows.filter(row => row.spelling && !row.right).length })); refresh();
    }
    setResults(rows);
  }, [difficulty, game, meta, refresh, updateStats]);
  const points = results?.reduce((sum, row) => sum + (row.points ?? (row.right ? 100 : 0)), 0) || 0;
  return <div className="mx-auto max-w-3xl space-y-5"><Link to="/arcade" className="tool-button">← Arcade</Link><h1 className="text-3xl font-black">{meta.title}</h1>
    <p>{meta.level ? `Word level: ${DIFFICULTY_META[difficulty]?.label}` : 'Curated mixed-level puzzles'}</p>
    <p>{meta.party ? 'Shared-device game: results stay on this screen and do not change anyone’s personal progress.' : `Personal best: ${best} points. Completed solo rounds are saved. Only full spelling answers count towards word mastery.`}</p>
    {results ? <section className="tool-card space-y-4"><h2 ref={heading} tabIndex={-1} className="text-2xl font-bold">Round complete{!meta.party && ` · ${points} points`}</h2>
      {!meta.party && <p>{results.filter(row => row.right).length}/{results.length} solved. {points > best ? 'New personal best!' : 'Try another round to practise.'}</p>}
      {game === 'relay' && <p>{[0, 1].map(team => `${results.find(row => row.team === team)?.teamName || `Team ${team + 1}`}: ${results.filter(row => row.team === team && row.right).length} points`).join(' · ')}</p>}
      <h3 className="font-bold">{meta.party ? 'Results' : 'Answers to review'}</h3><ul className="space-y-1">{results.map((row, i) => <li key={i}>{row.right ? '✓' : '○'} {row.word}{!meta.party && !row.right ? ' — practise this one' : ''}</li>)}</ul>
      <button className="tool-button" onClick={onReplay}>Play another round</button><Link className="tool-button" to="/arcade">Choose another game</Link>
    </section> : words.length ? <section className="tool-card"><Game words={words} settings={settings} onFinish={finish} /></section> : <p>No words are available at this level. Choose another level.</p>}
  </div>;
}
