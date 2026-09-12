import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Volume2, RotateCcw, MessageSquareText, ArrowRight, Timer, Heart, X, Check, Flag } from "lucide-react";
import { WORDS_BY_DIFFICULTY, MODES, DIFFICULTY_META } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { speak, cancelSpeech, isSpeechSupported, playTone } from "@/lib/speech";
import { addMissedWords, getMissed, removeMissedWord, appendHistory } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function diffChars(user, correct) {
  const out = [];
  const max = Math.max(user.length, correct.length);
  for (let i = 0; i < max; i++) {
    const c = correct[i] ?? "";
    const u = user[i] ?? "";
    out.push({ char: c || "_", ok: c === u });
  }
  return out;
}

export default function Practice() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { settings, updateStats, stats } = useApp();

  const modeId = params.get("mode") || "classic";
  const difficulty = params.get("difficulty") || settings.preferredDifficulty || "medium";
  const list = params.get("list");
  const mode = useMemo(() => MODES.find((m) => m.id === modeId) || MODES[0], [modeId]);

  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("prompt"); // prompt | feedback
  const [lastResult, setLastResult] = useState(null);
  const [session, setSession] = useState({
    correct: [],
    incorrect: [],
    startTime: Date.now(),
    times: [],
    bestStreak: 0,
    currentStreak: 0,
    livesLeft: mode.lives ?? Infinity,
  });
  const [replaysUsed, setReplaysUsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(mode.timer);
  const [sentencePlayed, setSentencePlayed] = useState(false);
  const [rate, setRate] = useState(settings.rate);
  const inputRef = useRef(null);
  const wordStartRef = useRef(Date.now());

  const currentWord = queue[index];

  // Build queue on mount
  useEffect(() => {
    let source;
    if (list === "missed") {
      const missed = getMissed();
      if (missed.length === 0) {
        toast("No missed words yet — practising medium instead.");
        source = WORDS_BY_DIFFICULTY.medium;
      } else {
        source = missed;
      }
    } else if (mode.mixed) {
      source = [
        ...WORDS_BY_DIFFICULTY.easy,
        ...WORDS_BY_DIFFICULTY.medium,
        ...WORDS_BY_DIFFICULTY.hard,
        ...WORDS_BY_DIFFICULTY.extreme,
      ];
    } else {
      source = WORDS_BY_DIFFICULTY[difficulty] || WORDS_BY_DIFFICULTY.medium;
    }
    const built = shuffle(source);
    const cap = mode.limit && mode.timer == null ? mode.limit : mode.limit && mode.timer ? mode.limit : built.length;
    setQueue(built.slice(0, cap));
    setIndex(0);
    setPhase("prompt");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeId, difficulty, list]);

  // Auto-play on new word
  useEffect(() => {
    if (!currentWord || phase !== "prompt") return;
    wordStartRef.current = Date.now();
    setReplaysUsed(0);
    setSentencePlayed(false);
    setInput("");
    setTimeLeft(mode.timer);
    if (settings.autoPlay && isSpeechSupported()) {
      // Small delay so voices are ready and the UI transitions in
      const t = setTimeout(() => {
        speak(currentWord.word, { rate, voiceName: settings.voiceName });
      }, 250);
      return () => clearTimeout(t);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, currentWord?.word, phase]);

  // Timer countdown
  useEffect(() => {
    if (!mode.timer || phase !== "prompt" || !currentWord) return;
    if (timeLeft == null) return;
    if (timeLeft <= 0) {
      handleSubmit(true); // time up = mark incorrect
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, currentWord]);

  useEffect(() => () => cancelSpeech(), []);

  const playWord = useCallback(() => {
    if (!currentWord) return;
    if (mode.singlePlay && replaysUsed >= 1) {
      toast("Test mode: word can only be played once.");
      return;
    }
    speak(currentWord.word, { rate, voiceName: settings.voiceName });
    setReplaysUsed((r) => r + 1);
  }, [currentWord, mode.singlePlay, rate, replaysUsed, settings.voiceName]);

  const playSentence = () => {
    if (!currentWord) return;
    if (mode.singlePlay) {
      toast("Sentence hints are disabled in test mode.");
      return;
    }
    speak(currentWord.example.replace(new RegExp(currentWord.word, "gi"), "blank"), {
      rate,
      voiceName: settings.voiceName,
    });
    setSentencePlayed(true);
  };

  const handleSubmit = (timedOut = false) => {
    if (!currentWord || phase !== "prompt") return;
    const attempt = (input || "").trim().toLowerCase();
    const correct = currentWord.word.trim().toLowerCase();
    const isRight = !timedOut && attempt === correct;
    const elapsed = (Date.now() - wordStartRef.current) / 1000;

    cancelSpeech();

    setLastResult({ isRight, attempt, correct, word: currentWord, elapsed, timedOut });
    setPhase("feedback");

    setSession((prev) => {
      const nextStreak = isRight ? prev.currentStreak + 1 : 0;
      const bestStreak = Math.max(prev.bestStreak, nextStreak);
      const livesLeft = isRight ? prev.livesLeft : prev.livesLeft - 1;
      const patch = {
        ...prev,
        correct: isRight ? [...prev.correct, currentWord] : prev.correct,
        incorrect: !isRight ? [...prev.incorrect, currentWord] : prev.incorrect,
        currentStreak: nextStreak,
        bestStreak,
        livesLeft,
        times: [...prev.times, elapsed],
      };
      return patch;
    });

    updateStats((prev) => {
      const nextStreak = isRight ? prev.currentStreak + 1 : 0;
      return {
        ...prev,
        totalAttempted: prev.totalAttempted + 1,
        totalCorrect: prev.totalCorrect + (isRight ? 1 : 0),
        totalIncorrect: prev.totalIncorrect + (isRight ? 0 : 1),
        currentStreak: nextStreak,
        bestStreak: Math.max(prev.bestStreak, nextStreak),
        wordsCompleted: prev.wordsCompleted + 1,
        highestDifficulty:
          isRight && rankDiff(currentWord.difficulty) > rankDiff(prev.highestDifficulty)
            ? currentWord.difficulty
            : prev.highestDifficulty,
      };
    });

    if (settings.soundEffects) playTone(isRight ? "success" : "error");
    if (isRight && list === "missed") removeMissedWord(currentWord.word);

    if (settings.autoAdvance && isRight) {
      setTimeout(() => advance(), 1500);
    }
  };

  const advance = () => {
    const nextIndex = index + 1;
    const outOfLives = session.livesLeft <= 0;
    const reachedLimit = mode.limit && !mode.timer && nextIndex >= (queue.length || 0);
    const noMore = nextIndex >= queue.length;
    if (outOfLives || reachedLimit || noMore) {
      finishSession();
      return;
    }
    setIndex(nextIndex);
    setPhase("prompt");
  };

  const finishSession = () => {
    const summary = {
      date: new Date().toISOString(),
      mode: mode.id,
      difficulty: mode.mixed ? "mixed" : difficulty,
      correct: session.correct,
      incorrect: session.incorrect,
      bestStreak: session.bestStreak,
      avgTime: session.times.length ? session.times.reduce((a, b) => a + b, 0) / session.times.length : 0,
    };
    if (session.incorrect.length) addMissedWords(session.incorrect);
    appendHistory({
      date: summary.date,
      mode: summary.mode,
      difficulty: summary.difficulty,
      correct: summary.correct.length,
      incorrect: summary.incorrect.length,
      bestStreak: summary.bestStreak,
      avgTime: summary.avgTime,
    });
    sessionStorage.setItem("sb.lastSession", JSON.stringify(summary));
    navigate("/results");
  };

  const giveUp = () => {
    if (!currentWord || phase !== "prompt") return;
    handleSubmit(true);
  };

  if (!isSpeechSupported()) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <h2 className="font-heading text-2xl font-bold text-rose-200">Speech synthesis unavailable</h2>
        <p className="mt-3 text-rose-100/80">
          Your browser does not support the SpeechSynthesis API. Please try Chrome, Edge, or Safari on desktop.
        </p>
        <button data-testid="back-to-home" onClick={() => navigate("/")} className="mt-6 rounded-lg bg-rose-500 px-5 py-2 font-semibold text-white">
          Back home
        </button>
      </div>
    );
  }

  if (!currentWord) return <div className="text-center text-slate-400">Loading…</div>;

  const progressPct = mode.limit && !mode.timer ? ((index + 1) / queue.length) * 100 : 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {/* Stage header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
            {mode.label}
          </span>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            {mode.mixed ? "Mixed" : DIFFICULTY_META[difficulty]?.label}
          </span>
          {mode.lives != null && (
            <span data-testid="lives-indicator" className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
              <Heart className="h-3 w-3 fill-current" /> {session.livesLeft}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
          {mode.limit && !mode.timer && (
            <span data-testid="word-progress">Word {index + 1} of {queue.length}</span>
          )}
          {mode.timer && (
            <span data-testid="timer-display" className={cn("flex items-center gap-1 font-mono", timeLeft <= 5 && "text-rose-300")}>
              <Timer className="h-3.5 w-3.5" /> {timeLeft}s
            </span>
          )}
          <span data-testid="session-streak" className="text-amber-300">Streak: {session.currentStreak}</span>
        </div>
      </div>

      {mode.limit && !mode.timer && (
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {phase === "prompt" && (
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950 p-6 sm:p-10">
          {/* Big audio button */}
          <div className="flex flex-col items-center gap-6">
            <button
              data-testid="play-word-button"
              onClick={playWord}
              className="group relative grid h-32 w-32 place-items-center rounded-full bg-amber-500 text-slate-950 shadow-2xl shadow-amber-500/30 transition hover:-translate-y-1 hover:scale-105 hover:bg-amber-400 sm:h-40 sm:w-40"
              aria-label="Play word audio"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-500/40 [animation-duration:2.4s]" />
              <Volume2 className="relative h-10 w-10 sm:h-14 sm:w-14" />
            </button>
            <p className="text-center text-sm text-slate-400">
              {mode.singlePlay ? (
                <>You may play the word only once. Listen carefully.</>
              ) : (
                <>Tap to hear the word · played {replaysUsed}× so far</>
              )}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                data-testid="repeat-word-button"
                onClick={playWord}
                disabled={mode.singlePlay}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-30"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Repeat
              </button>
              <button
                data-testid="use-in-sentence-button"
                onClick={playSentence}
                disabled={mode.singlePlay}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-30"
              >
                <MessageSquareText className="h-3.5 w-3.5" /> Use in a sentence
              </button>

              <div className="ml-1 flex overflow-hidden rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold">
                {["slow", "normal", "fast"].map((r) => (
                  <button
                    key={r}
                    data-testid={`speed-${r}-button`}
                    disabled={mode.singlePlay}
                    onClick={() => setRate(r)}
                    className={cn(
                      "px-3 py-2 capitalize transition disabled:opacity-30",
                      rate === r ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-amber-300"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {sentencePlayed && !mode.singlePlay && (
              <p data-testid="sentence-hint" className="max-w-xl rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-center text-sm italic text-slate-300">
                {currentWord.example.replace(new RegExp(currentWord.word, "gi"), "_____")}
              </p>
            )}
          </div>

          {/* Input */}
          <form
            className="mt-10"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(false);
            }}
          >
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
              autoCapitalize="off"
              spellCheck={false}
              placeholder="type the spelling…"
              className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-5 py-5 text-center font-mono text-2xl tracking-[0.3em] text-slate-100 outline-none ring-amber-500/40 transition focus:border-amber-500/50 focus:ring-2 sm:text-3xl"
            />
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                data-testid="give-up-button"
                onClick={giveUp}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
              >
                <Flag className="h-4 w-4" /> Give up
              </button>
              <button
                type="submit"
                data-testid="submit-spelling-button"
                disabled={!input.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-400 disabled:opacity-40"
              >
                Submit <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {phase === "feedback" && lastResult && <Feedback result={lastResult} onNext={advance} />}
    </div>
  );
}

function Feedback({ result, onNext }) {
  const { isRight, attempt, correct, word, timedOut } = result;
  const diff = useMemo(() => diffChars(attempt, correct), [attempt, correct]);

  return (
    <div
      data-testid={isRight ? "feedback-correct" : "feedback-incorrect"}
      className={cn(
        "rounded-3xl border p-6 sm:p-10",
        isRight
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-rose-500/40 bg-rose-500/10"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid h-12 w-12 place-items-center rounded-full",
            isRight ? "bg-emerald-500 text-emerald-950" : "bg-rose-500 text-rose-950"
          )}
        >
          {isRight ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
        </span>
        <div>
          <h3 className="font-heading text-3xl font-black text-slate-50">
            {isRight ? "Correct! 🎉" : timedOut ? "Time's up" : "Incorrect"}
          </h3>
          <p className="text-sm text-slate-300">
            {isRight ? "Beautifully spelled." : "Here's how it stacks up."}
          </p>
        </div>
      </div>

      {!isRight && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl bg-slate-950/60 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Your attempt</div>
            <div className="mt-1 font-mono text-xl text-rose-300">{attempt || "—"}</div>
          </div>
          <div className="rounded-xl bg-slate-950/60 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Correct spelling</div>
            <div className="mt-1 font-mono text-2xl">
              {diff.map((c, i) => (
                <span key={i} className={c.ok ? "text-emerald-300" : "text-rose-300 underline decoration-rose-400 decoration-2 underline-offset-4"}>
                  {c.char}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <InfoRow label="Word" value={word.word} />
        <InfoRow label="Part of speech" value={word.partOfSpeech} />
        <InfoRow label="Definition" value={word.definition} full />
        <InfoRow label="Example" value={word.example} full italic />
        <InfoRow label="Difficulty" value={DIFFICULTY_META[word.difficulty]?.label || word.difficulty} />
      </div>

      <div className="mt-6 flex items-center justify-end">
        <button
          data-testid="next-word-button"
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
        >
          Next word <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value, full, italic }) {
  return (
    <div className={cn("rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3", full && "sm:col-span-2")}>
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500/70">{label}</div>
      <div className={cn("mt-1 text-sm text-slate-200", italic && "italic text-slate-300")}>{value}</div>
    </div>
  );
}

function rankDiff(d) {
  return { easy: 1, medium: 2, hard: 3, extreme: 4 }[d] || 0;
}
