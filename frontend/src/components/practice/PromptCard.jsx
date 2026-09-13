import { useEffect, useRef, useState } from "react";
import { Volume2, RotateCcw, Turtle, MessageSquareText, Lightbulb, ArrowRight, Flag, BookOpen, Globe2, Mic2, Gavel } from "lucide-react";
import { buildHints, maskWord } from "@/lib/wordmeta";
import { cn } from "@/lib/utils";

function ControlButton({ testId, icon: Icon, label, onClick, disabled, active }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-30",
        active ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-500/40 hover:text-amber-300"
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

export function PromptCard({ word, mode, plays, onPlay, onSlow, onVerySlow, onSentence, sentenceShown, onHint, hintsUsed, onSubmit, onGiveUp, onJudgeAsk, judgeInfo, definitionShown }) {
  const [input, setInput] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [revealed, setRevealed] = useState([]);
  const [ready, setReady] = useState(!mode.judge);
  const inputRef = useRef(null);
  const hints = buildHints(word);

  useEffect(() => {
    setInput("");
    setRevealed([]);
    setHintOpen(false);
    setReady(!mode.judge);
    if (!mode.judge) setTimeout(() => inputRef.current?.focus(), 120);
  }, [word.word, mode.judge]);

  useEffect(() => {
    if (ready) setTimeout(() => inputRef.current?.focus(), 80);
  }, [ready]);

  const takeHint = (h) => {
    if (revealed.find((r) => r.id === h.id)) return;
    setRevealed((r) => [...r, h]);
    onHint(h);
    setHintOpen(false);
    inputRef.current?.focus();
  };

  const submit = (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    onSubmit(input);
  };

  return (
    <div data-testid="prompt-card" className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950 p-6 sm:p-10">
      <div className="flex flex-col items-center gap-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500/80">{mode.judge ? "The judge says" : "Hear the word"}</div>
        <button
          type="button"
          data-testid="play-word-button"
          onClick={onPlay}
          className="group relative grid h-28 w-28 place-items-center rounded-full bg-amber-500 text-slate-950 shadow-2xl shadow-amber-500/30 transition-transform hover:-translate-y-1 hover:scale-105 active:scale-95 sm:h-36 sm:w-36"
          aria-label="Play word audio (Space)"
        >
          <span className="pulse-ring absolute inset-0 rounded-full bg-amber-500/40" />
          <Volume2 className="relative h-10 w-10 sm:h-14 sm:w-14" />
        </button>
        <p className="text-center text-sm text-slate-400" aria-live="polite">
          {mode.singlePlay ? (plays >= 1 ? "The word has been spoken. Spell it." : "You will hear the word once. Listen carefully.") : `Tap to play · heard ${plays}×`}
        </p>

        {definitionShown && (
          <p data-testid="test-definition" className="max-w-xl rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-center text-sm text-slate-300">
            <span className="font-semibold text-amber-300">Definition:</span> {word.definition}
          </p>
        )}

        {mode.judge ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ControlButton testId="repeat-word-button" icon={RotateCcw} label="Repeat" onClick={onPlay} />
            <ControlButton testId="judge-definition-button" icon={BookOpen} label="Definition" onClick={() => onJudgeAsk("definition")} active={!!judgeInfo.definition} />
            <ControlButton testId="judge-sentence-button" icon={MessageSquareText} label="Sentence" onClick={() => onJudgeAsk("sentence")} active={!!judgeInfo.sentence} />
            <ControlButton testId="judge-origin-button" icon={Globe2} label="Origin" onClick={() => onJudgeAsk("origin")} active={!!judgeInfo.origin} />
            <ControlButton testId="judge-pronunciation-button" icon={Mic2} label="Pronunciation" onClick={() => onJudgeAsk("pronunciation")} active={!!judgeInfo.pronunciation} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ControlButton testId="repeat-word-button" icon={RotateCcw} label="Repeat" onClick={onPlay} disabled={mode.singlePlay} />
            <ControlButton testId="slow-word-button" icon={Turtle} label="Slow" onClick={onSlow} disabled={mode.singlePlay} />
            <ControlButton testId="very-slow-word-button" icon={Turtle} label="Very slow" onClick={onVerySlow} disabled={mode.singlePlay} />
            <ControlButton testId="use-in-sentence-button" icon={MessageSquareText} label="Sentence" onClick={onSentence} disabled={mode.singlePlay || mode.noHints} active={sentenceShown} />
            <div className="relative">
              <ControlButton testId="hint-button" icon={Lightbulb} label={hintsUsed ? `Hint (${hintsUsed})` : "Hint"} onClick={() => setHintOpen((o) => !o)} disabled={mode.noHints} active={hintOpen} />
              {hintOpen && (
                <div data-testid="hint-menu" className="absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Hints cost points</div>
                  {hints.map((h) => {
                    const used = revealed.some((r) => r.id === h.id);
                    return (
                      <button
                        key={h.id}
                        type="button"
                        data-testid={`hint-${h.id}`}
                        disabled={used}
                        onClick={() => takeHint(h)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-40"
                      >
                        <span>{h.label}</span>
                        <span className="text-xs text-amber-400">−{h.cost}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {(sentenceShown || revealed.length > 0 || Object.keys(judgeInfo).length > 0) && (
          <div className="w-full max-w-xl space-y-2" aria-live="polite">
            {sentenceShown && (
              <p data-testid="sentence-hint" className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-center text-sm italic text-slate-300">
                “{maskWord(word.example, word.word)}”
              </p>
            )}
            {judgeInfo.definition && <JudgeLine testId="judge-definition-text" label="Definition" text={word.definition} />}
            {judgeInfo.sentence && <JudgeLine testId="judge-sentence-text" label="Sentence" text={`“${maskWord(word.example, word.word)}”`} />}
            {judgeInfo.origin && <JudgeLine testId="judge-origin-text" label="Origin" text={word.origin ? `${word.origin}${word.originNote ? ` — ${word.originNote}` : ""}` : "The judge has no origin notes for this word."} />}
            {judgeInfo.pronunciation && <JudgeLine testId="judge-pronunciation-text" label="Pronunciation" text={word.pronunciation || `${word.syllables || ""} syllable word — listen again.`} />}
            {revealed.map((h) => (
              <p key={h.id} data-testid={`hint-text-${h.id}`} className="pop-in flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> <span><span className="font-semibold">{h.label}:</span> {h.text}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {!ready ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            data-testid="ready-to-spell-button"
            onClick={() => setReady(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3.5 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition-transform hover:-translate-y-0.5"
          >
            <Gavel className="h-4 w-4" /> Ready to spell
          </button>
        </div>
      ) : (
        <form className="mt-8" onSubmit={submit}>
          <label className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/80" htmlFor="spelling-input">
            Type the spelling
          </label>
          <input
            ref={inputRef}
            id="spelling-input"
            data-testid="spelling-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="done"
            placeholder="spell it here…"
            aria-label="Type the spelling"
            className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-5 text-center font-mono text-2xl tracking-[0.3em] text-slate-100 outline-none ring-amber-500/40 transition-[border-color,box-shadow] focus:border-amber-500/50 focus:ring-2 sm:text-3xl"
          />
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              data-testid="give-up-button"
              onClick={onGiveUp}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:border-rose-500/40 hover:text-rose-300"
            >
              <Flag className="h-4 w-4" /> Give up
            </button>
            <button
              type="submit"
              data-testid="submit-spelling-button"
              disabled={!input.trim()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-amber-400 disabled:opacity-40"
            >
              Submit <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 hidden text-center text-[11px] text-slate-600 sm:block">
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">Space</kbd> play · <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">Enter</kbd> submit · <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">Esc</kbd> exit
          </p>
        </form>
      )}
    </div>
  );
}

function JudgeLine({ testId, label, text }) {
  return (
    <p data-testid={testId} className="pop-in rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
      <span className="font-semibold text-amber-300">{label}:</span> {text}
    </p>
  );
}
