import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bookmark, BookOpen, Play, Search, Volume2 } from "lucide-react";
import { WORDS, DIFFICULTY_META, CATEGORIES, PATTERN_META, TOPIC_PACKS } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { getWordStats, isMastered } from "@/lib/storage";
import { getSavedWords, toggleSavedWord } from "@/lib/savedWords";
import { speak } from "@/lib/speech";
import { Eyebrow } from "@/components/ui-bits";
import { cn } from "@/lib/utils";

const PAGE = 48;
const DIFF_STYLE = {
  grade4: "text-emerald-300 border-emerald-500/30 bg-emerald-500/5",
  grade5: "text-teal-300 border-teal-500/30 bg-teal-500/5",
  grade6: "text-cyan-300 border-cyan-500/30 bg-cyan-500/5",
  year7: "text-sky-300 border-sky-500/30 bg-sky-500/5",
  easy: "text-indigo-300 border-indigo-500/30 bg-indigo-500/5",
  medium: "text-violet-300 border-violet-500/30 bg-violet-500/5",
  hard: "text-amber-300 border-amber-500/30 bg-amber-500/5",
  extreme: "text-rose-300 border-rose-500/30 bg-rose-500/5",
};

export default function Library() {
  const { settings } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const topic = TOPIC_PACKS.find((pack) => pack.id === params.get("topic"));
  const topicWords = useMemo(() => topic ? new Set(topic.words.map((word) => word.word)) : null, [topic]);
  const [q, setQ] = useState("");
  const [diff, setDiff] = useState("all");
  const [cat, setCat] = useState("all");
  const [pattern, setPattern] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const [savedWords, setSavedWords] = useState(() => getSavedWords());
  const wordStats = useMemo(() => getWordStats(), []);
  const savedSet = useMemo(
    () => new Set(savedWords.map((word) => word.toLocaleLowerCase())),
    [savedWords]
  );

  const patterns = useMemo(() => {
    const set = new Set();
    WORDS.forEach((word) => (word.patterns || []).forEach((item) => set.add(item)));
    return [...set].sort();
  }, []);

  const categories = useMemo(
    () => CATEGORIES.filter((category) => WORDS.some((word) => word.category === category)),
    []
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return WORDS.filter((word) => {
      if (topicWords && !topicWords.has(word.word)) return false;
      if (diff !== "all" && word.difficulty !== diff) return false;
      if (cat !== "all" && word.category !== cat) return false;
      if (pattern !== "all" && !(word.patterns || []).includes(pattern)) return false;
      if (
        needle &&
        !word.word.toLowerCase().includes(needle) &&
        !word.definition.toLowerCase().includes(needle)
      ) return false;
      return true;
    }).sort((a, b) => a.word.localeCompare(b.word));
  }, [q, diff, cat, pattern, topicWords]);

  const activeFilters = [diff !== "all", cat !== "all", pattern !== "all", Boolean(q.trim()), Boolean(topic)]
    .filter(Boolean)
    .length;

  const clearFilters = () => {
    setParams({});
    setQ("");
    setDiff("all");
    setCat("all");
    setPattern("all");
    setLimit(PAGE);
  };

  const toggleSaved = (word) => {
    setSavedWords(toggleSavedWord(word));
  };

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-950 to-cyan-950/20 p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative">
          <Eyebrow>Word Library</Eyebrow>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">
                {WORDS.length.toLocaleString()} words to explore.
              </h1>
              <p className="mt-2 max-w-2xl text-base text-slate-400">
                Browse from Basic foundations through Elite spelling bee vocabulary, save favourites, then practise any word instantly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/saved-words")}
              className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/15"
            >
              <Bookmark className="h-4 w-4" /> {savedWords.length} saved
            </button>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/35 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label htmlFor="library-topic" className="text-sm font-semibold text-slate-300">Topic pack</label>
          <select id="library-topic" value={topic?.id || ""} onChange={(event) => { setParams(event.target.value ? { topic: event.target.value } : {}); setLimit(PAGE); }} className="max-w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-200">
            <option value="">All words</option>
            {TOPIC_PACKS.map((pack) => <option key={pack.id} value={pack.id}>{pack.title}</option>)}
          </select>
          {topic && <button type="button" onClick={() => navigate(`/practice?mode=topic&topic=${topic.id}&difficulty=mixed`)} className="min-h-[44px] rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400">Practise full pack · {topic.words.length} words</button>}
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              data-testid="library-search"
              value={q}
              onChange={(event) => { setQ(event.target.value); setLimit(PAGE); }}
              placeholder="Search words or definitions…"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none focus:border-amber-500/50"
            />
          </label>

          <select
            data-testid="library-difficulty"
            value={diff}
            onChange={(event) => { setDiff(event.target.value); setLimit(PAGE); }}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-200 outline-none"
          >
            <option value="all">All levels</option>
            {Object.entries(DIFFICULTY_META).map(([id, meta]) => (
              <option key={id} value={id}>{meta.label}</option>
            ))}
          </select>

          <select
            data-testid="library-category"
            value={cat}
            onChange={(event) => { setCat(event.target.value); setLimit(PAGE); }}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-200 outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>

          {patterns.length > 0 && (
            <select
              data-testid="library-pattern"
              value={pattern}
              onChange={(event) => { setPattern(event.target.value); setLimit(PAGE); }}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-200 outline-none md:col-span-4"
            >
              <option value="all">All spelling patterns</option>
              {patterns.map((item) => <option key={item} value={item}>{PATTERN_META[item] || item}</option>)}
            </select>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p data-testid="library-count" className="text-xs font-semibold text-slate-500">
            {results.length.toLocaleString()} result{results.length === 1 ? "" : "s"}
            {activeFilters ? ` · ${activeFilters} filter${activeFilters === 1 ? "" : "s"} active` : ""}
          </p>
          {activeFilters > 0 && (
            <button type="button" onClick={clearFilters} className="text-xs font-bold text-amber-300 hover:text-amber-200">
              Clear filters
            </button>
          )}
        </div>
      </section>

      {results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">
          No words match. Try a different search or clear the filters.
        </div>
      ) : (
        <div data-testid="library-grid" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results.slice(0, limit).map((word) => {
            const stats = wordStats[word.word];
            const accuracy = stats?.attempts
              ? Math.round((stats.correct / stats.attempts) * 100)
              : null;
            const isSaved = savedSet.has(word.word.toLocaleLowerCase());

            return (
              <article
                key={word.word}
                data-testid={`library-word-${word.word}`}
                className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-all hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-mono text-xl font-semibold tracking-wider text-slate-100 group-hover:text-amber-200">{word.word}</h3>
                    <div className="mt-1 text-xs text-slate-500">
                      {word.partOfSpeech}{word.category ? ` · ${word.category}` : ""}{word.syllableBreak ? ` · ${word.syllableBreak}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={isSaved ? `Remove ${word.word} from saved words` : `Save ${word.word}`}
                      onClick={() => toggleSaved(word.word)}
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full border transition",
                        isSaved
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                          : "border-slate-700 text-slate-500 hover:border-amber-500/40 hover:text-amber-300"
                      )}
                    >
                      <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
                    </button>
                    <span className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                      DIFF_STYLE[word.difficulty] || "border-slate-700 text-slate-300"
                    )}>
                      {DIFFICULTY_META[word.difficulty]?.label || word.difficulty}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-300">{word.definition}</p>
                {word.example && <p className="mt-1 text-sm italic text-slate-400">“{word.example}”</p>}
                {word.spellingTip && <p className="mt-2 text-xs text-amber-300">💡 {word.spellingTip}</p>}
                {word.origin && <p className="mt-1 text-xs text-slate-500">Origin: {word.origin}{word.originNote ? ` — ${word.originNote}` : ""}</p>}

                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <span className={cn(
                    "text-xs font-semibold",
                    accuracy == null ? "text-slate-600" : isMastered(stats) ? "text-emerald-300" : "text-slate-400"
                  )}>
                    {accuracy == null ? "Not attempted" : isMastered(stats) ? `Mastered · ${accuracy}%` : `Mastery ${accuracy}%`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      aria-label={`Hear ${word.word}`}
                      data-testid={`library-hear-${word.word}`}
                      onClick={() => speak(word.word, { rate: settings.rate, voiceName: settings.voiceName, voiceLang: settings.voiceLang })}
                      className="grid h-9 w-9 place-items-center rounded-full border border-slate-700 text-slate-300 hover:border-amber-500/40 hover:text-amber-300"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                    <button
                      data-testid={`library-practice-${word.word}`}
                      onClick={() => navigate(`/practice?mode=ten&difficulty=${word.difficulty}&word=${encodeURIComponent(word.word)}`)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400"
                    >
                      <Play className="h-3 w-3" /> Practice
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {results.length > limit && (
        <div className="text-center">
          <button
            data-testid="library-load-more"
            onClick={() => setLimit((current) => current + PAGE)}
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-amber-500/40"
          >
            Show more
          </button>
        </div>
      )}
    </div>
  );
}
