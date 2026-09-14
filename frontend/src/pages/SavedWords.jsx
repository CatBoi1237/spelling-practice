import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bookmark, Play, Trash2, Volume2 } from "lucide-react";

import { WORD_MAP, DIFFICULTY_META } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { getSavedWords, unsaveWord } from "@/lib/savedWords";
import { speak } from "@/lib/speech";

export default function SavedWords() {
  const { settings } = useApp();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => getSavedWords());

  useEffect(() => {
    const refresh = () => setSaved(getSavedWords());
    window.addEventListener("spellbee:saved-words-changed", refresh);
    return () => window.removeEventListener("spellbee:saved-words-changed", refresh);
  }, []);

  const rows = useMemo(
    () => saved.map((name) => WORD_MAP.get(name.toLocaleLowerCase()) || { word: name, difficulty: "custom" }),
    [saved]
  );

  const remove = (word) => {
    unsaveWord(word);
    setSaved(getSavedWords());
  };

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-7 sm:p-9">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25">
            <Bookmark className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Saved Words</div>
            <h1 className="mt-1 font-heading text-4xl font-black text-slate-50 sm:text-5xl">Your personal word bank</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Save tricky or interesting words from the Word Library, then come back to practise them whenever you want.
            </p>
          </div>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/25 p-10 text-center">
          <Bookmark className="mx-auto h-10 w-10 text-slate-600" />
          <h2 className="mt-4 font-heading text-2xl font-bold text-slate-200">No saved words yet</h2>
          <p className="mt-2 text-sm text-slate-500">Open the Word Library and tap the bookmark icon on any word you want to keep.</p>
          <Link to="/library" className="mt-6 inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400">
            Browse Word Library
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-slate-400">{rows.length} saved word{rows.length === 1 ? "" : "s"}</p>
            <Link to="/library" className="text-sm font-bold text-amber-400 hover:text-amber-300">Add more →</Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((word) => (
              <article key={word.word} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-mono text-xl font-semibold tracking-wider text-slate-100">{word.word}</h2>
                    <div className="mt-1 text-xs text-slate-500">
                      {DIFFICULTY_META[word.difficulty]?.label || (word.difficulty === "custom" ? "Saved word" : word.difficulty)}
                      {word.partOfSpeech ? ` · ${word.partOfSpeech}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${word.word} from saved words`}
                    onClick={() => remove(word.word)}
                    className="grid h-9 w-9 place-items-center rounded-full border border-slate-700 text-slate-400 hover:border-rose-500/40 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {word.definition && <p className="mt-3 text-sm text-slate-300">{word.definition}</p>}
                {word.spellingTip && <p className="mt-2 text-xs text-amber-300">💡 {word.spellingTip}</p>}

                <div className="mt-auto flex gap-2 pt-5">
                  <button
                    type="button"
                    onClick={() => speak(word.word, { rate: settings.rate, voiceName: settings.voiceName, voiceLang: settings.voiceLang })}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:border-amber-500/40 hover:text-amber-300"
                  >
                    <Volume2 className="h-4 w-4" /> Hear
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/practice?mode=ten&difficulty=${word.difficulty === "custom" ? "mixed" : word.difficulty}&word=${encodeURIComponent(word.word)}`)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400"
                  >
                    <Play className="h-4 w-4" /> Practise
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
