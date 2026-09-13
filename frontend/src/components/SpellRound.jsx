import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2, RotateCcw, ArrowRight, Check, X } from "lucide-react";
import { speak, cancelSpeech, playTone } from "@/lib/speech";
import { useApp } from "@/context/AppContext";
import { recordWordAttempt } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Compact spelling round used by Daily Challenge and Multiplayer races.
export default function SpellRound({ word, index, total, maxPlays = 3, onResult, label }) {
  const { settings } = useApp();
  const [input, setInput] = useState("");
  const [plays, setPlays] = useState(0);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const startRef = useRef(Date.now());
  const roundTokenRef = useRef(0);
  const speechTimerRef = useRef(null);
  const advancingRef = useRef(false);

  useEffect(() => {
    // Every word gets a unique speech session.
    // Any delayed speech belonging to an older word becomes invalid.
    roundTokenRef.current += 1;
    const token = roundTokenRef.current;

    advancingRef.current = false;
    setInput("");
    setPlays(1);
    setResult(null);
    startRef.current = Date.now();

    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }

    // Stop the previous word before starting this one.
    cancelSpeech();

    // Chrome/Web Speech can take a moment to actually cancel an utterance.
    speechTimerRef.current = setTimeout(() => {
      if (token !== roundTokenRef.current) return;

      speak(word.word, {
        rate: settings.rate,
        voiceName: settings.voiceName,
        voiceLang: settings.voiceLang,
      });

      inputRef.current?.focus();
    }, 400);

    return () => {
      // Invalidate any speech that belongs to this old round.
      roundTokenRef.current += 1;

      if (speechTimerRef.current) {
        clearTimeout(speechTimerRef.current);
        speechTimerRef.current = null;
      }

      cancelSpeech();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.word, index]);

  const play = () => {
    if (plays >= maxPlays) {
      toast(`You can only hear this word ${maxPlays} times.`);
      return;
    }

    const token = roundTokenRef.current;
    setPlays((p) => p + 1);

    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }

    cancelSpeech();

    // Give the browser time to fully cancel the previous utterance.
    speechTimerRef.current = setTimeout(() => {
      if (token !== roundTokenRef.current) return;

      speak(word.word, {
        rate: settings.rate,
        voiceName: settings.voiceName,
        voiceLang: settings.voiceLang,
      });
    }, 120);
  };

  const submit = (e) => {
    e?.preventDefault();
    if (result) return;
    const attempt = input.trim().toLowerCase();
    if (!attempt) return;
    const isRight = attempt === word.word.trim().toLowerCase();

    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }

    cancelSpeech();
    recordWordAttempt(word.word, isRight);
    if (settings.soundEffects) playTone(isRight ? "success" : "error");
    setResult({ isRight, attempt, timeMs: Date.now() - startRef.current });
  };

  const next = () => {
    if (!result || advancingRef.current) return;

    advancingRef.current = true;

    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }

    cancelSpeech();

    onResult({
      correct: result.isRight,
      attempt: result.attempt,
      timeMs: result.timeMs,
      word,
    });
  };

  const diff = useMemo(() => {
    if (!result) return [];
    const correct = word.word;
    const max = Math.max(result.attempt.length, correct.length);
    const out = [];
    for (let i = 0; i < max; i++) out.push({ char: correct[i] ?? "_", ok: correct[i] === result.attempt[i] });
    return out;
  }, [result, word.word]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950 p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between text-xs font-semibold text-slate-400">
        <span data-testid="round-label" className="uppercase tracking-[0.22em] text-amber-500/80">{label}</span>
        <span data-testid="round-progress">Word {index + 1} of {total}</span>
      </div>

      {!result && (
        <>
          <div className="flex flex-col items-center gap-5">
            <button
              data-testid="round-play-button"
              onClick={play}
              className="relative grid h-28 w-28 place-items-center rounded-full bg-amber-500 text-slate-950 shadow-2xl shadow-amber-500/30 transition hover:-translate-y-1 hover:bg-amber-400"
              aria-label="Play word audio"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-500/40 [animation-duration:2.4s]" />
              <Volume2 className="relative h-10 w-10" />
            </button>
            <button
              data-testid="round-repeat-button"
              onClick={play}
              disabled={plays >= maxPlays}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-30"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Hear it again ({Math.max(0, maxPlays - plays)} left)
            </button>
          </div>

          <form className="mt-8" onSubmit={submit}>
            <input
              ref={inputRef}
              data-testid="round-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="type the spelling…"
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-5 text-center font-mono text-2xl tracking-[0.3em] text-slate-100 outline-none ring-amber-500/40 transition focus:border-amber-500/50 focus:ring-2"
            />
            <button
              type="submit"
              data-testid="round-submit-button"
              disabled={!input.trim()}
              className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-40"
            >
              Submit <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </>
      )}

      {result && (
        <div data-testid={result.isRight ? "round-feedback-correct" : "round-feedback-incorrect"}>
          <div className="flex items-center gap-3">
            <span className={cn("grid h-11 w-11 place-items-center rounded-full", result.isRight ? "bg-emerald-500 text-emerald-950" : "bg-rose-500 text-rose-950")}>
              {result.isRight ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </span>
            <div>
              <h3 className="font-heading text-2xl font-black text-slate-50">{result.isRight ? "Correct" : "Incorrect"}</h3>
              <p className="text-sm text-slate-400">{word.partOfSpeech} · {word.definition}</p>
              {!result.isRight && word.spellingTip && <p className="mt-1 text-xs text-amber-300">💡 {word.spellingTip}</p>}
            </div>
          </div>
          {!result.isRight && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-950/60 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Your attempt</div>
                <div className="mt-1 font-mono text-lg text-rose-300">{result.attempt || "—"}</div>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Correct spelling</div>
                <div className="mt-1 font-mono text-xl">
                  {diff.map((c, i) => (
                    <span key={i} className={c.ok ? "text-emerald-300" : "text-rose-300 underline decoration-rose-400 decoration-2 underline-offset-4"}>
                      {c.char}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <button
            data-testid="round-next-button"
            onClick={next}
            className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-400"
          >
            {index + 1 >= total ? "See results" : "Next word"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
