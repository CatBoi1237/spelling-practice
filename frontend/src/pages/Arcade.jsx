import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { WORDS_BY_DIFFICULTY, DIFFICULTY_META } from "@/data/words";
import { WORD_PAIRS, WORD_PARTS } from "@/data/wordGames";
import { useApp } from "@/context/AppContext";
import { recordWordAttempt, appendHistory, getHistory } from "@/lib/storage";
import { redactWord } from "@/lib/learningTools";
import { speak, cancelSpeech } from "@/lib/speech";
import FlappyFlight from "@/components/FlappyFlight";

const GAMES = [
  ["flappy", "Flappy Bee", "Fly through garden gates, then spell to continue. Keyboard, touch and spelling-only play."],
  ["detective", "Word Detective", "Solve definition clues and reveal the missing spelling."],
  ["pairs", "Confusing Pairs", "Choose the right word for each sentence."],
  ["parts", "Prefix & Suffix Lab", "Build words and discover how their meanings change."],
];
export default function Arcade() {
  const [params] = useSearchParams();
  const [level, setLevel] = useState("grade5");
  const game = params.get("game");
  if (GAMES.some(([id]) => id === game)) return <Round key={`${game}:${params.get("level")}`} game={game} level={params.get("level") || "grade5"} />;
  return <div className="space-y-6"><h1 className="text-4xl font-black">Spelling Arcade</h1><p>Play, learn and beat your personal best. Spelling answers count towards word mastery.</p>
    <label>Word level <select className="tool-input" value={level} onChange={e => setLevel(e.target.value)}>{Object.entries(DIFFICULTY_META).map(([id, meta]) => <option key={id} value={id}>{meta.label}</option>)}</select></label>
    <div className="grid gap-4 sm:grid-cols-2">{GAMES.map(([id, title, description]) => <article className="tool-card" key={id}><h2 className="text-xl font-bold">{title}</h2><p className="my-3">{description}</p><Link className="tool-button" to={`/arcade?game=${id}&level=${level}`}>Play {title}</Link></article>)}</div>
    <Link className="tool-button" to="/learning-tools">Quests, calendar and learning tools →</Link>
  </div>;
}
function Round({ game, level }) {
  const { settings, updateStats, refresh } = useApp();
  const pool = useMemo(() => [...(WORDS_BY_DIFFICULTY[level] || WORDS_BY_DIFFICULTY.grade5)].sort(() => Math.random() - 0.5).slice(0, 10), [level]);
  const questions = game === "pairs" ? WORD_PAIRS : game === "parts" ? WORD_PARTS : pool;
  const [index, setIndex] = useState(0), [answer, setAnswer] = useState(""), [result, setResult] = useState(null);
  const reducedMotion = settings.reducedMotion || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [phase, setPhase] = useState(game === "flappy" && !reducedMotion ? "fly" : "spell");
  const [lives, setLives] = useState(3), [rows, setRows] = useState([]), [done, setDone] = useState(false);
  const locked = useRef(false), started = useRef(Date.now()), submitted = useRef(false);
  const item = questions[index];
  const target = item?.answer || item?.word;
  const label = GAMES.find(([id]) => id === game)[1];
  const best = useMemo(() => Math.max(0, ...getHistory().filter(h => h.mode === `arcade-${game}` && h.difficulty === level).map(h => h.points || 0)), [game, level]);
  const bestAccuracy = useMemo(() => Math.max(0, ...getHistory().filter(h => h.mode === `arcade-${game}` && h.difficulty === level && h.correct + h.incorrect === questions.length).map(h => Math.round(h.correct / questions.length * 100))), [game, level, questions.length]);
  useEffect(() => () => cancelSpeech(), []);
  const flightEnd = useCallback(safe => { if (!safe) setLives(v => Math.max(0, v - 1)); setPhase("spell"); }, []);
  const finish = nextRows => {
    if (submitted.current) return; submitted.current = true;
    const correct = nextRows.filter(r => r.right).map(r => ({ word: r.word }));
    const incorrect = nextRows.filter(r => !r.right).map(r => ({ word: r.word }));
    appendHistory({ date: new Date().toISOString(), mode: `arcade-${game}`, modeLabel: label, difficulty: level, correct: correct.length, incorrect: incorrect.length, points: correct.length * 100, total: nextRows.length, accuracy: Math.round(correct.length / Math.max(1, nextRows.length) * 100), avgTime: (Date.now() - started.current) / Math.max(1, nextRows.length) / 1000 });
    updateStats(prev => ({ ...prev, sessions: prev.sessions + 1 })); refresh(); setDone(true);
  };
  const check = e => {
    e.preventDefault(); if (locked.current || !answer.trim()) return; locked.current = true;
    const right = answer.trim().toLowerCase() === target.toLowerCase();
    // Pair questions assess usage, not spelling; don't inflate spelling mastery.
    if (game !== "pairs") recordWordAttempt(target, right);
    updateStats(prev => ({ ...prev, totalAttempted: prev.totalAttempted + 1, totalCorrect: prev.totalCorrect + Number(right), totalIncorrect: prev.totalIncorrect + Number(!right), totalPoints: prev.totalPoints + (right ? 100 : 0) }));
    setRows(current => [...current, { word: target, right }]); setResult(right);
  };
  const next = () => { if (index + 1 === questions.length || (game === "flappy" && lives === 0)) { finish(rows); return; } setIndex(i => i + 1); setAnswer(""); setResult(null); locked.current = false; setPhase(game === "flappy" && !reducedMotion ? "fly" : "spell"); };
  const score = rows.filter(r => r.right).length * 100;
  return <div className="mx-auto max-w-2xl space-y-5"><Link to="/arcade" className="tool-button">← Arcade</Link><h1 className="text-3xl font-black">{label}</h1>
    <p>Personal best: {best} points · Best full-round accuracy: {bestAccuracy}% · {DIFFICULTY_META[level]?.label || "Very Easy"}</p>
    {done ? <section className="tool-card"><h2 className="text-2xl font-bold">Round complete · {score} points</h2><p>{score > best ? "New personal best!" : "Keep practising to improve your best."}</p><p>{rows.filter(r => r.right).length} correct out of {rows.length}</p><Link to="/arcade" className="tool-button">Choose another game</Link><Link to="/practice?mode=mistakes&difficulty=mixed" className="tool-button">Review spelling mistakes</Link></section> : <>
      <p>Word {index + 1}/{questions.length}{game === "flappy" ? ` · ${lives} flight lives` : ""} · {score} points</p>
      {phase === "fly" ? <FlappyFlight key={index} onFinish={flightEnd} /> : <form className="tool-card space-y-4" onSubmit={check}>
        {game === "pairs" ? <p className="text-xl">{item.sentence}</p> : game === "parts" ? <p className="text-xl">Add the {item.position} <strong>{item.part}-</strong> to <strong>{item.base}</strong>. What word do you get?</p> : <><p className="text-xl">{game === "detective" ? redactWord(item.definition, target) : "Listen to the word, then spell it."}</p><button type="button" className="tool-button" onClick={() => speak(target, { rate: settings.rate, voiceName: settings.voiceName, voiceLang: settings.voiceLang })}>Hear word</button><p>{target.length} letters</p></>}
        {game === "pairs" ? <fieldset disabled={result !== null}><legend>Choose a word</legend>{item.options.map(option => <label key={option} className="mr-4 inline-flex gap-2"><input type="radio" name="pair" value={option} checked={answer === option} onChange={e => setAnswer(e.target.value)} />{option}</label>)}</fieldset> : <input aria-label="Your spelling" className="tool-input" autoComplete="off" autoCapitalize="off" spellCheck={false} value={answer} disabled={result !== null} onChange={e => setAnswer(e.target.value)} />}
        {result === null ? <button className="tool-button" disabled={!answer.trim()}>Check answer</button> : <div role="status"><p className="font-bold">{result ? "Correct!" : `The answer is ${target}.`}</p><p>{item.tip || item.spellingTip}</p><button type="button" className="tool-button" onClick={next}>Continue</button></div>}
      </form>}
    </>}
  </div>;
}
