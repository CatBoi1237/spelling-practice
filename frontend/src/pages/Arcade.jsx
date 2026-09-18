import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { WORDS_BY_DIFFICULTY, DIFFICULTY_META } from "@/data/words";
import { WORD_PAIRS, WORD_PARTS } from "@/data/wordGames";
import { useApp } from "@/context/AppContext";
import { recordWordAttempt, appendHistory, getArcadeRecords } from "@/lib/storage";
import { redactWord } from "@/lib/learningTools";
import { cancelSpeech } from "@/lib/speech";
import { scrambleWord, missingLetters, spellingSeconds, sampleRound } from "@/lib/arcadeChallenges";
import ArcadeAudio from "@/components/ArcadeAudio";
import FlappyFlight from "@/components/FlappyFlight";

const GAMES = [
  ["scramble", "Word Scramble", "Rearrange mixed-up letters using a meaning clue, then spell the whole word."],
  ["missing", "Missing Letters", "Restore the missing letters and type the complete spelling."],
  ["memory", "Look–Cover–Spell", "Study a word, cover it when ready, then spell it from memory. No time limit."],
  ["flappy", "Flappy Bee", "Fly through garden gates, then spell to continue. Keyboard, touch and spelling-only play."],
  ["detective", "Word Detective", "Solve definition clues and reveal the missing spelling."],
  ["pairs", "Confusing Pairs", "Choose the right word for each sentence."],
  ["parts", "Prefix & Suffix Lab", "Build words and discover how their meanings change."],
];
export default function Arcade() {
  const [params] = useSearchParams();
  const [level, setLevel] = useState("grade5");
  const [round, setRound] = useState(0);
  const game = params.get("game");
  if (GAMES.some(([id]) => id === game)) return <Round key={`${game}:${params.get("level")}:${round}`} onReplay={() => setRound(value => value + 1)} game={game} level={params.get("level") || "grade5"} />;
  return <div className="space-y-6"><h1 className="text-4xl font-black">Spelling Arcade</h1><p>Play, learn and beat your personal best. Spelling answers count towards word mastery.</p>
    <label>Word level <select className="tool-input" value={level} onChange={e => setLevel(e.target.value)}>{Object.entries(DIFFICULTY_META).map(([id, meta]) => <option key={id} value={id}>{meta.label}</option>)}</select></label>
    <div className="grid gap-4 sm:grid-cols-2">{GAMES.map(([id, title, description]) => <article className="tool-card" key={id}><h2 className="text-xl font-bold">{title}</h2><p className="my-3">{description}</p><Link className="tool-button" to={`/arcade?game=${id}&level=${level}`}>Play {title}</Link></article>)}</div>
    <p>Confusing Pairs has {WORD_PAIRS.length} exercises and Prefix &amp; Suffix Lab has {WORD_PARTS.length}. Each round draws ten mixed-level questions. The word level applies to the other games.</p>
    <Link className="tool-button" to="/learning-tools">Quests, calendar and learning tools →</Link>
  </div>;
}
function Round({ game, level, onReplay }) {
  const { settings, updateStats, refresh } = useApp();
  const questions = useMemo(() => {
    const source = game === "pairs" ? WORD_PAIRS : game === "parts" ? WORD_PARTS : (WORDS_BY_DIFFICULTY[level] || WORDS_BY_DIFFICULTY.grade5);
    return sampleRound(source).map(item => item.options ? { ...item, options: sampleRound(item.options, item.options.length) } : item);
  }, [game, level]);
  const [index, setIndex] = useState(0), [answer, setAnswer] = useState(""), [result, setResult] = useState(null);
  const reducedMotion = settings.reducedMotion || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [phase, setPhase] = useState(game === "flappy" && !reducedMotion ? "fly" : "spell");
  const [lives, setLives] = useState(3), [rows, setRows] = useState([]), [done, setDone] = useState(false);
  const locked = useRef(false), answerStarted = useRef(Date.now()), submitted = useRef(false);
  const [studying, setStudying] = useState(game === "memory");
  const item = questions[index];
  const target = item?.answer || item?.word;
  const audioText = game === "pairs" ? item.sentence.replace("_____", "blank") : game === "parts" ? `Add the ${item.position}, ${item.part.split("").join(", ")}, to the word ${item.base}.` : target;
  const audioLabel = game === "pairs" ? "Hear sentence" : game === "parts" ? "Hear instruction" : "Hear word";
  const label = GAMES.find(([id]) => id === game)[1];
  const previousRecord = useMemo(() => getArcadeRecords()[`arcade-${game}:${level}`], [game, level]);
  const best = previousRecord?.points || 0;
  const bestAccuracy = previousRecord?.rounds?.[questions.length]?.accuracy || 0;
  const bestSpeed = previousRecord?.rounds?.[questions.length]?.perfectSeconds ?? null;
  useEffect(() => () => cancelSpeech(), []);
  const flightEnd = useCallback(safe => { if (!safe) setLives(v => Math.max(0, v - 1)); answerStarted.current = Date.now(); setPhase("spell"); }, []);
  const finish = nextRows => {
    if (submitted.current) return; submitted.current = true;
    const correct = nextRows.filter(r => r.right).map(r => ({ word: r.word }));
    const incorrect = nextRows.filter(r => !r.right).map(r => ({ word: r.word }));
    appendHistory({ date: new Date().toISOString(), mode: `arcade-${game}`, modeLabel: label, difficulty: level, correct: correct.length, incorrect: incorrect.length, points: correct.length * 100, total: nextRows.length, accuracy: Math.round(correct.length / Math.max(1, nextRows.length) * 100), roundLength: questions.length, timingVersion: 2, avgTime: nextRows.reduce((sum, r) => sum + r.seconds, 0) / Math.max(1, nextRows.length) });
    updateStats(prev => ({ ...prev, sessions: prev.sessions + 1 })); refresh(); setDone(true);
  };
  const check = e => {
    e.preventDefault(); if (locked.current || studying || !answer.trim()) return; locked.current = true; cancelSpeech();
    const right = answer.trim().toLowerCase() === target.toLowerCase();
    // Pair questions assess usage, not spelling; don't inflate spelling mastery.
    if (game !== "pairs") recordWordAttempt(target, right);
    updateStats(prev => ({ ...prev, totalAttempted: prev.totalAttempted + 1, totalCorrect: prev.totalCorrect + Number(right), totalIncorrect: prev.totalIncorrect + Number(!right), totalPoints: prev.totalPoints + (right ? 100 : 0) }));
    setRows(current => [...current, { word: target, right, seconds: spellingSeconds(answerStarted.current) }]); setResult(right);
  };
  const next = () => { if (index + 1 === questions.length || (game === "flappy" && lives === 0)) { finish(rows); return; } answerStarted.current = Date.now(); setStudying(game === "memory"); setIndex(i => i + 1); setAnswer(""); setResult(null); locked.current = false; setPhase(game === "flappy" && !reducedMotion ? "fly" : "spell"); };
  const score = rows.filter(r => r.right).length * 100;
  const average = rows.reduce((sum, r) => sum + r.seconds, 0) / Math.max(1, rows.length);
  return <div className="mx-auto max-w-2xl space-y-5"><Link to="/arcade" className="tool-button">← Arcade</Link><h1 className="text-3xl font-black">{label}</h1>
    <p>Personal best: {best} points · Best full-round accuracy: {bestAccuracy}% · {DIFFICULTY_META[level]?.label || "Very Easy"}</p>
    <p>Fastest perfect round: {bestSpeed === null ? "Complete a perfect round to set a record" : `${bestSpeed.toFixed(1)} seconds per word`}. Flight, study and feedback time are excluded.</p>
    {done ? <section className="tool-card"><h2 className="text-2xl font-bold">Round complete · {score} points</h2><p>{score > best ? "New personal best!" : "Keep practising to improve your best."}</p><p>{rows.filter(r => r.right).length} correct out of {rows.length} · {average.toFixed(1)} seconds per answer</p>{rows.length === questions.length && rows.every(r => r.right) && (bestSpeed === null || average < bestSpeed) && <p>New perfect-round speed record!</p>}<button type="button" className="tool-button" onClick={onReplay}>Play another round</button><Link to="/arcade" className="tool-button">Choose another game</Link><Link to="/practice?mode=mistakes&difficulty=mixed" className="tool-button">Review spelling mistakes</Link></section> : <>
      <p>Word {index + 1}/{questions.length}{game === "flappy" ? ` · ${lives} flight lives` : ""} · {score} points</p>
      {phase === "fly" ? <FlappyFlight key={index} onFinish={flightEnd} /> : <form className="tool-card space-y-4" onSubmit={check}>
        {game === "memory" ? <div><p>Look carefully, say the word, then cover it when you are ready.</p>{studying ? <><p className="my-4 text-3xl font-bold" aria-live="polite">{target}</p><button type="button" className="tool-button" onClick={() => { setStudying(false); answerStarted.current = Date.now(); }}>Cover word and spell</button></> : <p>Spell the word you just studied.</p>}</div> : game === "scramble" || game === "missing" ? <><p>{redactWord(item.definition, target)}</p><p className="text-2xl font-mono tracking-widest" aria-label={game === "scramble" ? "Mixed letters" : "Word with missing letters"}>{game === "scramble" ? scrambleWord(target).split("").join(" ") : missingLetters(target)}</p><p>Type the complete word.</p></> : game === "pairs" ? <p className="text-xl">{item.sentence}</p> : game === "parts" ? <p className="text-xl">Add the {item.position} <strong>{item.position === "prefix" ? `${item.part}-` : `-${item.part}`}</strong> to <strong>{item.base}</strong>. What word do you get?</p> : <><p className="text-xl">{game === "detective" ? redactWord(item.definition, target) : "Listen to the word, then spell it."}</p><p>{target.length} letters</p></>}
        {(game !== "memory" || studying || result !== null) && <ArcadeAudio key={index} text={audioText} settings={settings} label={audioLabel} autoPlay={game === "flappy" && result === null && settings.autoPlay !== false} />}
        {game === "pairs" ? <fieldset disabled={result !== null}><legend>Choose a word</legend>{item.options.map(option => <label key={option} className="mr-4 inline-flex gap-2"><input type="radio" name="pair" value={option} checked={answer === option} onChange={e => setAnswer(e.target.value)} />{option}</label>)}</fieldset> : <input aria-label="Your spelling" className="tool-input" autoComplete="off" autoCapitalize="off" spellCheck={false} value={answer} disabled={result !== null || studying} onChange={e => setAnswer(e.target.value)} />}
        {result === null ? <button className="tool-button" disabled={!answer.trim() || studying}>Check answer</button> : <div role="status"><p className="font-bold">{result ? "Correct!" : `The answer is ${target}.`}</p><p>{item.tip || item.spellingTip}</p><button type="button" className="tool-button" onClick={next}>Continue</button></div>}
      </form>}
    </>}
  </div>;
}
