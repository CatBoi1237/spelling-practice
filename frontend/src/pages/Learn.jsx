import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, X, Play } from "lucide-react";
import { LESSONS } from "@/data/lessons";
import { WORDS, PATTERN_META } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { playTone } from "@/lib/speech";
import { Eyebrow, PrimaryButton, GhostButton } from "@/components/ui-bits";
import { cn } from "@/lib/utils";

export default function Learn() {
  const [active, setActive] = useState(null);
  const lesson = LESSONS.find((l) => l.id === active);

  if (lesson) return <Lesson lesson={lesson} onBack={() => setActive(null)} />;

  return (
    <div className="space-y-8">
      <header>
        <Eyebrow>Learn</Eyebrow>
        <h1 className="mt-2 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">Spelling rules that actually stick.</h1>
        <p className="mt-2 max-w-xl text-base text-slate-400">Short lessons, real examples, a three-question check, then a focused practice round.</p>
      </header>
      <div data-testid="lessons-grid" className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.map((l) => (
          <button key={l.id} data-testid={`lesson-${l.id}`} onClick={() => setActive(l.id)} className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-left transition-[transform,border-color] hover:-translate-y-0.5 hover:border-amber-500/40">
            <span className="text-3xl">{l.emoji}</span>
            <h3 className="mt-3 font-heading text-lg font-bold text-slate-100">{l.title}</h3>
            <p className="mt-1 flex-1 text-sm text-slate-400">{l.summary}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-amber-400">Open lesson <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Lesson({ lesson, onBack }) {
  const navigate = useNavigate();
  const { settings } = useApp();
  const [answers, setAnswers] = useState({});
  const practiceWords = useMemo(() => WORDS.filter((w) => (w.patterns || []).includes(lesson.pattern)).length, [lesson.pattern]);
  const score = lesson.quiz.filter((q, i) => answers[i] === q.answer).length;
  const done = Object.keys(answers).length === lesson.quiz.length;

  const pick = (i, opt) => {
    if (answers[i] != null) return;
    setAnswers((a) => ({ ...a, [i]: opt }));
    if (settings.soundEffects) playTone(opt === lesson.quiz[i].answer ? "success" : "error");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <button data-testid="lesson-back" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-amber-300"><ArrowLeft className="h-4 w-4" /> All lessons</button>
      <header>
        <span className="text-4xl">{lesson.emoji}</span>
        <h1 className="mt-3 font-heading text-4xl font-black tracking-tight text-slate-50">{lesson.title}</h1>
        <p className="mt-2 text-base text-slate-400">{lesson.summary}</p>
      </header>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <Eyebrow>The rule</Eyebrow>
        <p className="mt-3 text-base leading-relaxed text-slate-200">{lesson.body}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {lesson.examples.map((e) => <span key={e} className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-sm text-amber-200">{e}</span>)}
        </div>
      </section>

      <section data-testid="lesson-quiz" className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex items-center justify-between">
          <Eyebrow>Mini quiz</Eyebrow>
          {done && <span data-testid="quiz-score" className="text-sm font-semibold text-amber-300">{score}/{lesson.quiz.length} correct</span>}
        </div>
        <div className="mt-4 space-y-4">
          {lesson.quiz.map((q, i) => (
            <div key={i}>
              <div className="text-xs font-semibold text-slate-500">Question {i + 1} · pick the correct spelling</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {q.options.map((opt) => {
                  const chosen = answers[i];
                  const isAnswer = opt === q.answer;
                  const state = chosen == null ? "idle" : isAnswer ? "right" : chosen === opt ? "wrong" : "dim";
                  return (
                    <button
                      key={opt}
                      data-testid={`quiz-${i}-${opt.replace(/\W+/g, "-")}`}
                      onClick={() => pick(i, opt)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                        state === "idle" && "border-slate-700 bg-slate-950/50 text-slate-200 hover:border-amber-500/40",
                        state === "right" && "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
                        state === "wrong" && "border-rose-500/50 bg-rose-500/10 text-rose-200",
                        state === "dim" && "border-slate-800 text-slate-500"
                      )}
                    >
                      <span className={q.options[0].includes(" ") ? "" : "font-mono tracking-wider"}>{opt}</span>
                      {state === "right" && <Check className="h-4 w-4" />}
                      {state === "wrong" && <X className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-6">
        <div>
          <Eyebrow className="text-indigo-300">Practice words</Eyebrow>
          <div className="mt-1 font-heading text-xl font-bold text-slate-100">{PATTERN_META[lesson.pattern] || lesson.pattern}</div>
          <div className="text-sm text-slate-400">{practiceWords} words in the library use this pattern.</div>
        </div>
        <div className="flex gap-2">
          <GhostButton data-testid="lesson-library-button" onClick={() => navigate("/library")}>Browse</GhostButton>
          <PrimaryButton data-testid="lesson-practice-button" disabled={practiceWords < 3} onClick={() => navigate(`/practice?mode=pattern&difficulty=${settings.preferredDifficulty || "medium"}&pattern=${encodeURIComponent(lesson.pattern)}`)}>
            <Play className="h-4 w-4" /> Practise this pattern
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
}
