import { useEffect, useRef, useState } from 'react';

export function AnswerBox({ onAnswer, label = 'Your spelling', button = 'Check answer', maxLength = 60, disabled = false, focusKey = 0 }) {
  const [answer, setAnswer] = useState('');
  const input = useRef(null);
  useEffect(() => { setAnswer(''); if (!disabled) input.current?.focus(); }, [focusKey, disabled]);
  return <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
    event.preventDefault(); if (disabled || !answer.trim()) return;
    onAnswer(answer); setAnswer('');
  }}>
    <label className="flex-1">{label}<input ref={input} className="tool-input w-full" value={answer} onChange={e => setAnswer(e.target.value)} maxLength={maxLength} autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={disabled} /></label>
    <button className="tool-button" disabled={disabled || !answer.trim()}>{button}</button>
  </form>;
}

export function NextButton({ onClick, children = 'Next word' }) {
  const button = useRef(null);
  useEffect(() => { button.current?.focus(); }, []);
  return <button ref={button} type="button" className="tool-button" onClick={onClick}>{children}</button>;
}

export function Message({ children }) {
  return <p role="status" className="min-h-6 font-semibold">{children}</p>;
}
