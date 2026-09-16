import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PATTERN_META } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { speak, speakSequence, cancelSpeech, isSpeechSupported, playTone } from "@/lib/speech";
import { recordWordAttempt, appendHistory, getHistory, countMastered } from "@/lib/storage";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getMode, resolveMode, buildQueue, scoreAnswer } from "@/lib/session";
import { recommendDifficulty, rankDiff } from "@/lib/skill";
import { normalize } from "@/lib/wordmeta";
import { SessionHeader } from "@/components/practice/SessionHeader";
import { PromptCard } from "@/components/practice/PromptCard";
import { FeedbackCard } from "@/components/practice/FeedbackCard";
import PracticeHub from "@/pages/PracticeHub";
import { BeeMascot } from "@/components/BeeMascot";

export default function Practice() {
  const [params] = useSearchParams();
  if (!params.get("mode")) return <PracticeHub />;
  return <Session key={params.toString()} />;
}

function Session() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { settings, updateStats } = useApp();
  const { playerId, playerName } = useAuth();

  const modeId = params.get("mode") || "classic";
  const mode = useMemo(() => resolveMode(getMode(modeId), settings, params), [modeId, settings, params]);
  const requested = params.get("difficulty") || settings.preferredDifficulty || "medium";
  const difficulty = useMemo(() => {
    if (requested !== "adaptive") return requested;
    return recommendDifficulty(getHistory(), settings.preferredDifficulty || "medium").difficulty;
  }, [requested, settings.preferredDifficulty]);
  const pattern = params.get("pattern");
  const category = params.get("category");
  const topic = params.get("topic");
  const origin = params.get("origin");
  const singleWord = params.get("word");
  const legacyList = params.get("list"); // backwards compat: list=missed

  const [queue, setQueue] = useState([]);
  const [notice, setNotice] = useState(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("prompt");
  const [lastResult, setLastResult] = useState(null);
  const [plays, setPlays] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintCost, setHintCost] = useState(0);
  const [sentenceShown, setSentenceShown] = useState(false);
  const [judgeInfo, setJudgeInfo] = useState({});
  const [timeLeft, setTimeLeft] = useState(mode.timer ?? null);
  const [session, setSession] = useState({ correct: [], incorrect: [], times: [], bestStreak: 0, currentStreak: 0, livesLeft: mode.lives ?? null, points: 0, hints: 0, startTime: Date.now() });
  const wordStartRef = useRef(Date.now());
  const advanceTimer = useRef(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const currentWord = queue[index];
  const voiceOpts = useMemo(() => ({ rate: settings.rate, voiceName: settings.voiceName, voiceLang: settings.voiceLang }), [settings]);

  useEffect(() => {
    const effectiveMode = legacyList === "missed" ? { ...mode, source: "missed" } : mode;
    const { queue: q, notice: n } = buildQueue({ mode: effectiveMode, difficulty, pattern, category, origin, topic, word: singleWord });
    setQueue(q);
    setNotice(n);
    if (n) toast(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New word: reset per-word state and auto-play
  useEffect(() => {
    if (!currentWord || phase !== "prompt") return;
    wordStartRef.current = Date.now();
    setPlays(0);
    setHintsUsed(0);
    setHintCost(0);
    setSentenceShown(false);
    setJudgeInfo({});
    setTimeLeft(mode.timer ?? null);
    if (settings.autoPlay && isSpeechSupported()) {
      const t = setTimeout(() => {
        speak(mode.judge ? `Your word is: ${currentWord.word}.` : currentWord.word, voiceOpts);
        setPlays(1);
      }, 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, currentWord?.word, phase]);

  // Countdown
  useEffect(() => {
    if (mode.timer == null || phase !== "prompt" || !currentWord || timeLeft == null) return;
    if (timeLeft <= 0) {
      handleSubmit("", true);
      return;
    }
    if (timeLeft <= 3 && settings.soundEffects) playTone("tick");
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, currentWord]);

  useEffect(() => () => { cancelSpeech(); clearTimeout(advanceTimer.current); }, []);

  const playWord = useCallback((rateOverride) => {
    if (!currentWord) return;
    if (mode.singlePlay && plays >= 1) {
      toast("Test mode: the word is spoken only once.");
      return;
    }
    speak(currentWord.word, { ...voiceOpts, rate: rateOverride || voiceOpts.rate });
    setPlays((p) => p + 1);
  }, [currentWord, mode.singlePlay, plays, voiceOpts]);

  const playSentence = () => {
    if (!currentWord || mode.singlePlay || mode.noHints) return;
    speakSequence([currentWord.word, currentWord.example, currentWord.word], voiceOpts);
    setSentenceShown(true);
  };

  const judgeAsk = (kind) => {
    if (!currentWord) return;
    setJudgeInfo((j) => ({ ...j, [kind]: true }));
    if (kind === "definition") speak(`Definition: ${currentWord.definition}`, voiceOpts);
    if (kind === "sentence") speakSequence([currentWord.example, currentWord.word], voiceOpts);
    if (kind === "origin") speak(currentWord.origin ? `This word comes from ${currentWord.origin}. ${currentWord.originNote || ""}` : "The judge has no origin notes for this word.", voiceOpts);
    if (kind === "pronunciation") speakSequence([currentWord.word], { ...voiceOpts, rate: "verySlow" });
  };

  const onHint = (h) => {
    setHintsUsed((n) => n + 1);
    setHintCost((c) => c + h.cost);
    setSession((s) => ({ ...s, hints: s.hints + 1 }));
    updateStats((prev) => ({ ...prev, hintsUsed: (prev.hintsUsed || 0) + 1 }));
  };

  const handleSubmit = (raw, timedOut = false) => {
    if (!currentWord || phase !== "prompt") return;
    const attempt = normalize(raw);
    const correct = normalize(currentWord.word);
    const isRight = !timedOut && attempt === correct;
    const elapsedMs = Date.now() - wordStartRef.current;
    const elapsed = elapsedMs / 1000;
    cancelSpeech();

    const nextStreak = isRight ? session.currentStreak + 1 : 0;
    const pts = Math.max(0, scoreAnswer({ isRight, elapsedSec: elapsed, hintsUsed, streak: nextStreak, mode }) - (isRight ? hintCost : 0));
    const ws = recordWordAttempt(currentWord.word, isRight);

    setLastResult({ isRight, attempt, correct, word: currentWord, elapsed, timedOut, points: pts, streak: nextStreak, mastered: isRight && ws.streak === 3 });
    setPhase("feedback");

    setSession((prev) => ({
      ...prev,
      correct: isRight ? [...prev.correct, currentWord] : prev.correct,
      incorrect: !isRight ? [...prev.incorrect, currentWord] : prev.incorrect,
      currentStreak: nextStreak,
      bestStreak: Math.max(prev.bestStreak, nextStreak),
      livesLeft: prev.livesLeft == null ? null : isRight ? prev.livesLeft : prev.livesLeft - 1,
      times: [...prev.times, elapsed],
      points: prev.points + pts,
    }));

    updateStats((prev) => {
      const streak = isRight ? prev.currentStreak + 1 : 0;
      return {
        ...prev,
        totalAttempted: prev.totalAttempted + 1,
        totalCorrect: prev.totalCorrect + (isRight ? 1 : 0),
        totalIncorrect: prev.totalIncorrect + (isRight ? 0 : 1),
        currentStreak: streak,
        bestStreak: Math.max(prev.bestStreak, streak),
        wordsCompleted: prev.wordsCompleted + 1,
        totalPoints: (prev.totalPoints || 0) + pts,
        totalTimeMs: (prev.totalTimeMs || 0) + elapsedMs,
        fastestAnswerMs: isRight ? Math.min(prev.fastestAnswerMs ?? Infinity, elapsedMs) : prev.fastestAnswerMs,
        highestDifficulty: isRight && rankDiff(currentWord.difficulty) > rankDiff(prev.highestDifficulty) ? currentWord.difficulty : prev.highestDifficulty,
      };
    });

    if (settings.soundEffects) playTone(isRight ? "success" : "error");
    if (settings.autoAdvance && isRight) advanceTimer.current = setTimeout(() => advance(), 1800);
  };

  const advance = () => {
    clearTimeout(advanceTimer.current);
    const s = sessionRef.current;
    const nextIndex = index + 1;
    const outOfLives = s.livesLeft != null && s.livesLeft <= 0;
    if (outOfLives || nextIndex >= queue.length) {
      finishSession(s);
      return;
    }
    setIndex(nextIndex);
    setPhase("prompt");
  };

  const practiceAgain = () => {
    clearTimeout(advanceTimer.current);
    setQueue((q) => [...q, currentWord]);
    toast.success(`"${currentWord.word}" will come back later this session.`);
    advance();
  };

  const finishSession = (s) => {
    const total = s.correct.length + s.incorrect.length;
    const summary = {
      date: new Date().toISOString(),
      mode: mode.id,
      modeLabel: mode.label,
      difficulty: mode.mixed ? "mixed" : difficulty,
      correct: s.correct,
      incorrect: s.incorrect,
      bestStreak: s.bestStreak,
      points: s.points,
      hints: s.hints,
      avgTime: s.times.length ? s.times.reduce((a, b) => a + b, 0) / s.times.length : 0,
      durationMs: Date.now() - s.startTime,
    };
    appendHistory({ date: summary.date, mode: summary.mode, difficulty: summary.difficulty, correct: s.correct.length, incorrect: s.incorrect.length, bestStreak: s.bestStreak, avgTime: summary.avgTime, points: s.points });
    updateStats((prev) => ({
      ...prev,
      sessions: (prev.sessions || 0) + 1,
      perfectSessions: (prev.perfectSessions || 0) + (total >= 20 && s.incorrect.length === 0 ? 1 : 0),
      extremeSessions: (prev.extremeSessions || 0) + (difficulty === "extreme" && total >= 5 ? 1 : 0),
    }));
    sessionStorage.setItem("sb.lastSession", JSON.stringify(summary));
    if (total >= 3) {
      api.post("/scores", {
        player_id: playerId, name: playerName, mode: mode.id, difficulty: summary.difficulty,
        correct: s.correct.length, total, points: s.points, best_streak: s.bestStreak,
        avg_time_ms: Math.round(summary.avgTime * 1000), duration_ms: summary.durationMs, mastered: countMastered(),
      }).catch(() => {});
    }
    navigate("/results");
  };

  const exit = () => {
    const s = sessionRef.current;
    cancelSpeech();
    if (s.correct.length + s.incorrect.length > 0) finishSession(s);
    else navigate("/practice");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "Escape") { e.preventDefault(); exit(); return; }
      if (phase === "prompt") {
        if (e.key === " " && (!inInput || !document.activeElement.value)) { e.preventDefault(); playWord(); }
        if ((e.key === "r" || e.key === "R") && !inInput) { e.preventDefault(); playWord(); }
      } else if (phase === "feedback" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, playWord, index]);

  if (!isSpeechSupported()) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <BeeMascot mood="sad" size={80} className="mx-auto" />
        <h2 className="mt-4 font-heading text-2xl font-bold text-rose-200">Speech isn't available in this browser</h2>
        <p className="mt-3 text-rose-100/80">Spelling Bee reads words aloud using your browser's speech engine. Please try Chrome, Edge, or Safari.</p>
        <button data-testid="back-to-home" onClick={() => navigate("/")} className="mt-6 rounded-lg bg-rose-500 px-5 py-2 font-semibold text-white">Back home</button>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center">
        <BeeMascot mood="sad" size={80} className="mx-auto" />
        <h2 className="mt-4 font-heading text-2xl font-bold text-slate-100">No words available</h2>
        <p className="mt-2 text-sm text-slate-400">{notice || "This word list is empty right now. Try another mode."}</p>
        <button data-testid="back-to-practice" onClick={() => navigate("/practice")} className="mt-6 rounded-lg bg-amber-500 px-5 py-2 font-semibold text-slate-950">Choose a mode</button>
      </div>
    );
  }

  const isLast = index + 1 >= queue.length || (session.livesLeft != null && session.livesLeft <= 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <SessionHeader
        mode={mode}
        difficulty={pattern ? PATTERN_META[pattern] || pattern : difficulty}
        index={index}
        total={mode.limit ? queue.length : 0}
        streak={session.currentStreak}
        timeLeft={mode.timer != null && phase === "prompt" ? timeLeft : null}
        lives={session.livesLeft}
        points={session.points}
        onExit={exit}
      />

      {phase === "prompt" && (
        <PromptCard
          word={currentWord}
          mode={mode}
          plays={plays}
          onPlay={() => playWord()}
          onSlow={() => playWord("slow")}
          onVerySlow={() => playWord("verySlow")}
          onSentence={playSentence}
          sentenceShown={sentenceShown}
          onHint={onHint}
          hintsUsed={hintsUsed}
          onSubmit={(v) => handleSubmit(v, false)}
          onGiveUp={() => handleSubmit("", true)}
          onJudgeAsk={judgeAsk}
          judgeInfo={judgeInfo}
          definitionShown={!!mode.showDefinition}
        />
      )}

      {phase === "feedback" && lastResult && (
        <FeedbackCard
          result={lastResult}
          points={lastResult.points}
          streak={lastResult.streak}
          mastered={lastResult.mastered}
          isLast={isLast}
          onNext={advance}
          onPracticeAgain={practiceAgain}
          onHear={() => speak(currentWord.word, { ...voiceOpts, rate: "slow" })}
          showDefinitions={settings.showDefinitions !== false}
          showTips={settings.showTips !== false}
        />
      )}
    </div>
  );
}
