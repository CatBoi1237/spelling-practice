import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Volume2, Play } from "lucide-react";
import { WORDS, DIFFICULTY_META, CATEGORIES, PATTERN_META } from "@/data/words";
import { useApp } from "@/context/AppContext";
import { getWordStats, isMastered } from "@/lib/storage";
import { speak } from "@/lib/speech";
import { Eyebrow } from "@/components/ui-bits";
import { cn } from "@/lib/utils";

const PAGE = 48;
const DIFF_STYLE = { easy: "text-emerald-300 border-emerald-500/30", medium: "text-sky-300 border-sky-500/30", hard: "text-amber-300 border-amber-500/30", extreme: "text-rose-300 border-rose-500/30" };

export default function Library() {
  const { settings } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [diff, setDiff] = useState("all");
  const [cat, setCat] = useState("all");
  const [pattern, setPattern] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const wordStats = useMemo(() => getWordStats(), []);

  const patterns = useMemo(() => {
    const s = new Set();
    WORDS.forEach((w) => (w.patterns || []).forEach((p) => s.add(p)));
    return [...s].sort();
  }, []);
  const categories = useMemo(() => CATEGORIES.filter((c) => WORDS.some((w) => w.category === c)), []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return WORDS.filter((w) => {
      if (diff !== "all" && w.difficulty !== diff) return false;
      if (cat !== "all" && w.category !== cat) return false;
      if (pattern !== "all" && !(w.patterns || []).includes(pattern)) return false;
      if (needle && !w.word.toLowerCase().includes(needle) && !w.definition.toLowerCase().includes(needle)) return false;
      return true;
    }).sort((a, b) => a.word.localeCompare(b.word));
  }, [q, diff, cat, pattern]);

  return (
    <div className="space-y-8">
      <header>
        <Eyebrow>Word Library</Eyebrow>
        <h1 className="mt-2 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">{WORDS.length.toLocaleString()} words, fully annotated.</h1>
        <p className="mt-2 max-w-xl text-base text-slate-400">Search by word or meaning, filter by difficulty, category or spelling pattern, and drill any word instantly.</p>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            data-testid="library-search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }}
            placeholder="Search words or definitions…"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-4 text-sm text-slate-100 outline-none focus:border-amber-500/50"
          />
        </label>
        <select data-testid="library-difficulty" value={diff} onChange={(e) => { setDiff(e.target.value); setLimit(PAGE); }} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-slate-200 outline-none">
          <option value="all">All difficulties</option>
          {Object.entries(DIFFICULTY_META).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}
        </select>
        <select data-testid="library-category" value={cat} onChange={(e) => { setCat(e.target.value); setLimit(PAGE); }} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-slate-200 outline-none">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {patterns.length > 0 && (
          <select data-testid="library-pattern" value={pattern} onChange={(e) => { setPattern(e.target.value); setLimit(PAGE); }} className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-slate-200 outline-none md:col-span-4">
            <option value="all">All spelling patterns</option>
            {patterns.map((p) => <option key={p} value={p}>{PATTERN_META[p] || p}</option>)}
          </select>
        )}
      </div>

      <p data-testid="library-count" className="text-xs font-semibold text-slate-500">{results.length.toLocaleString()} result{results.length === 1 ? "" : "s"}</p>

      {results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">No words match. Try a different search or clear the filters.</div>
      ) : (
        <div data-testid="library-grid" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results.slice(0, limit).map((w) => {
            const ws = wordStats[w.word];
            const acc = ws?.attempts ? Math.round((ws.correct / ws.attempts) * 100) : null;
            return (
              <article key={w.word} data-testid={`library-word-${w.word}`} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-5 transition-colors hover:border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-mono text-xl font-semibold tracking-wider text-slate-100">{w.word}</h3>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest", DIFF_STYLE[w.difficulty])}>{DIFFICULTY_META[w.difficulty]?.label}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{w.partOfSpeech}{w.category ? ` · ${w.category}` : ""}{w.syllableBreak ? ` · ${w.syllableBreak}` : ""}</div>
                <p className="mt-3 text-sm text-slate-300">{w.definition}</p>
                <p className="mt-1 text-sm italic text-slate-400">“{w.example}”</p>
                {w.spellingTip && <p className="mt-2 text-xs text-amber-300">💡 {w.spellingTip}</p>}
                {w.origin && <p className="mt-1 text-xs text-slate-500">Origin: {w.origin}{w.originNote ? ` — ${w.originNote}` : ""}</p>}
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className={cn("text-xs font-semibold", acc == null ? "text-slate-600" : isMastered(ws) ? "text-emerald-300" : "text-slate-400")}>
                    {acc == null ? "Not attempted" : isMastered(ws) ? `Mastered · ${acc}%` : `Mastery ${acc}%`}
                  </span>
                  <div className="flex gap-2">
                    <button aria-label={`Hear ${w.word}`} data-testid={`library-hear-${w.word}`} onClick={() => speak(w.word, { rate: settings.rate, voiceName: settings.voiceName, voiceLang: settings.voiceLang })} className="grid h-9 w-9 place-items-center rounded-full border border-slate-700 text-slate-300 hover:text-amber-300"><Volume2 className="h-4 w-4" /></button>
                    <button data-testid={`library-practice-${w.word}`} onClick={() => navigate(`/practice?mode=ten&difficulty=${w.difficulty}&word=${encodeURIComponent(w.word)}`)} className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400"><Play className="h-3 w-3" /> Practice</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {results.length > limit && (
        <div className="text-center">
          <button data-testid="library-load-more" onClick={() => setLimit((l) => l + PAGE)} className="rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-amber-500/40">Show more</button>
        </div>
      )}
    </div>
  );
}
