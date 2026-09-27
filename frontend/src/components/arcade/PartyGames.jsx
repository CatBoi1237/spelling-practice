import { useMemo, useState } from 'react';
import ArcadeAudio from '@/components/ArcadeAudio';
import { sampleRound } from '@/lib/arcadeChallenges';
import { cleanWord } from '@/lib/arcadePuzzles';
import { redactWord } from '@/lib/learningTools';
import { cancelSpeech } from '@/lib/speech';
import { AnswerBox, Message, NextButton } from './GameControls';

export function SpokenBee({ words, settings, onFinish }) {
  const bank = useMemo(() => sampleRound(words, Math.min(30, words.length)), [words]);
  const [names, setNames] = useState(''), [players, setPlayers] = useState(null), [turn, setTurn] = useState(0), [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false), [judged, setJudged] = useState(false), [message, setMessage] = useState('');
  if (!players) return <form className="space-y-4" onSubmit={event => {
    event.preventDefault(); const list = names.split(/[\n,]/).map(name => name.trim()).filter(Boolean);
    if (list.length < 2 || list.length > 8 || list.some(name => name.length > 30) || new Set(list.map(cleanWord)).size !== list.length) { setMessage('Enter 2–8 different player names, each at most 30 characters.'); return; }
    setPlayers(list.map(name => ({ name, active: true, score: 0 }))); setMessage('');
  }}>
    <p>A host holds the device and plays each word. The current player spells aloud. The host reveals the spelling and marks the answer. This game does not use a microphone or automatically judge speech.</p>
    <p>A missed word eliminates that player. The last remaining player wins; if the word bank runs out, remaining players share the win. Everyone can practise the revealed spelling.</p>
    <label className="block">Player names, separated by commas<textarea className="tool-input block w-full" rows={3} value={names} onChange={e => setNames(e.target.value)} maxLength={255} /></label>
    <Message>{message}</Message><button className="tool-button">Start spelling bee</button>
  </form>;
  const active = players.filter(player => player.active), finished = judged && (active.length <= 1 || index + 1 === bank.length);
  const judge = right => {
    if (judged) return;
    cancelSpeech(); setJudged(true);
    setPlayers(players.map((player, i) => i === turn ? { ...player, score: player.score + Number(right), active: right } : player));
    setMessage(right ? `${players[turn].name} stays in!` : `${players[turn].name} is out. The spelling is ${bank[index].word}.`);
  };
  return <div className="space-y-4"><p className="text-2xl font-bold">{players[turn].name}'s turn</p><p>Host: keep the screen hidden from the player until they finish spelling aloud.</p>
    <p>{redactWord(bank[index].definition, bank[index].word)}</p><ArcadeAudio key={index} text={bank[index].word} settings={settings} />
    {!revealed ? <button className="tool-button" onClick={() => setRevealed(true)}>Host: reveal spelling</button> : <><p className="text-3xl font-bold">{bank[index].word}</p><p>{bank[index].spellingTip}</p>{!judged && <div className="flex gap-2"><button className="tool-button" onClick={() => judge(true)}>Spelled correctly</button><button className="tool-button" onClick={() => judge(false)}>Missed word</button></div>}</>}
    <Message>{message}</Message><ul>{players.map(player => <li key={player.name}>{player.name}: {player.score} correct · {player.active ? 'still in' : 'out'}</li>)}</ul>
    {judged && <NextButton onClick={() => {
      if (finished) { onFinish(players.map(player => ({ word: `${player.name}: ${player.score} correct — ${player.active ? 'winner' : 'out'}`, right: player.active, points: 0 }))); return; }
      let next = (turn + 1) % players.length;
      while (!players[next].active) next = (next + 1) % players.length;
      cancelSpeech(); setTurn(next); setIndex(index + 1); setRevealed(false); setJudged(false); setMessage('');
    }}>{finished ? 'Show winners' : 'Next player'}</NextButton>}
  </div>;
}

export function SpellingRelay({ words, settings, onFinish }) {
  const bank = useMemo(() => sampleRound(words, 6), [words]);
  const [teams, setTeams] = useState(['Team A', 'Team B']), [started, setStarted] = useState(false), [index, setIndex] = useState(0), [built, setBuilt] = useState('');
  const [missed, setMissed] = useState(false), [rows, setRows] = useState([]), [message, setMessage] = useState('');
  const word = bank[index], complete = built === word.word, team = index % 2;
  if (!started) return <form className="space-y-4" onSubmit={event => {
    event.preventDefault(); if (!teams.every(name => name.trim()) || cleanWord(teams[0]) === cleanWord(teams[1])) { setMessage('Choose two different team names.'); return; }
    setTeams(teams.map(name => name.trim())); setStarted(true); setMessage('');
  }}><p>Teams alternate words. Within a team, pass the keyboard to a new teammate for each letter. Listen to the word, then build it one letter at a time. A wrong letter can be retried; a word earns a point only if every letter was correct first time.</p>
    <p>Play seated on one shared device. Each team gets the same number of words.</p>
    {teams.map((name, i) => <label className="block" key={i}>Team {i + 1} name<input className="tool-input block" maxLength={30} value={name} onChange={e => setTeams(teams.map((value, j) => i === j ? e.target.value : value))} /></label>)}
    <Message>{message}</Message><button className="tool-button">Start relay</button></form>;
  // Use an even number of words so both teams have equal turns.
  const length = bank.length - bank.length % 2;
  if (!length) return <p>This level needs at least two words. Choose another level.</p>;
  return <div className="space-y-4"><p className="text-2xl font-bold">{teams[team]} · Word {index + 1}/{length}</p>
    <p>{redactWord(word.definition, word.word)}</p><ArcadeAudio key={index} text={word.word} settings={settings} />
    <p className="text-3xl font-mono tracking-widest break-words">{[...word.word].map((letter, i) => i < built.length ? letter : '_').join(' ')}</p>
    <p>Teammate {built.length + 1}: add the next letter, then pass the keyboard.</p>
    <AnswerBox label="Next letter" button="Add letter" maxLength={1} disabled={complete} focusKey={`${index}:${built.length}`} onAnswer={value => {
      if (complete) return;
      if (cleanWord(value) !== word.word[built.length]) { setMissed(true); setMessage('Try that letter again. This word is now a practice word rather than a point.'); return; }
      setBuilt(built + word.word[built.length]); setMessage('Correct letter. Pass to your next teammate.');
    }} />
    <Message>{complete ? `${word.word} complete! ${missed ? 'Good recovery.' : 'One team point!'}` : message}</Message>
    {complete ? <NextButton onClick={() => {
      const next = [...rows, { word: `${teams[team]}: ${word.word}`, right: !missed, points: Number(!missed), team, teamName: teams[team] }];
      if (index + 1 === length) onFinish(next);
      else { cancelSpeech(); setRows(next); setIndex(index + 1); setBuilt(''); setMissed(false); setMessage(''); }
    }}>{index + 1 === length ? 'Show team results' : 'Next team'}</NextButton> : <button className="tool-button" onClick={() => { setBuilt(word.word); setMissed(true); }}>Reveal word and pass</button>}
    <ul>{teams.map((name, i) => <li key={i}>{name}: {rows.filter(row => row.team === i && row.right).length} points</li>)}</ul>
  </div>;
}
