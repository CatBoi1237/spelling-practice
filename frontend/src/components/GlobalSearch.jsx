import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { WORDS, DIFFICULTY_META } from "@/data/words";

const PAGES = [
  ["Home", "/", "Dashboard and recommendations"],
  ["Practice", "/practice", "Practice modes and difficulty levels"],
  ["Daily Challenge", "/daily", "Today's five-word challenge"],
  ["Multiplayer", "/multiplayer", "Race and Classroom Mode"],
  ["Join Game", "/join", "Enter a Race or Classroom code"],
  ["Teacher Dashboard", "/teacher", "Teacher tools and recent classroom reports"],
  ["My Word Lists", "/word-lists", "Create and manage custom spelling lists"],
  ["Saved Words", "/saved-words", "Your bookmarked vocabulary"],
  ["Word Library", "/library", "Search the full SpellBee word bank"],
  ["Learn", "/learn", "Spelling lessons and patterns"],
  ["Progress", "/progress", "Charts, stats and recent sessions"],
  ["Profile", "/profile", "Your spelling profile"],
  ["Leaderboards", "/leaderboards", "Ranks and weekly league"],
  ["Achievements", "/achievements", "Badges and milestones"],
  ["Settings", "/settings", "Voice, theme and practice preferences"],
];

export default function GlobalSearch({ open, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();

    const pages = PAGES
      .filter(([label, , description]) => !needle || `${label} ${description}`.toLocaleLowerCase().includes(needle))
      .slice(0, needle ? 5 : 6)
      .map(([label, to, description]) => ({ type: "page", label, to, description }));

    if (!needle) return pages;

    const words = WORDS
      .filter((word) =>
        word.word.toLocaleLowerCase().includes(needle) ||
        String(word.definition || "").toLocaleLowerCase().includes(needle)
      )
      .slice(0, 8)
      .map((word) => ({
        type: "word",
        label: word.word,
        word,
        description: `${DIFFICULTY_META[word.difficulty]?.label || word.difficulty} · ${word.definition || "Spelling word"}`,
      }));

    return [...pages, ...words].slice(0, 10);
  }, [query]);

  if (!open) return null;

  const go = (result) => {
    if (result.type === "word") {
      navigate(`/practice?mode=ten&difficulty=${result.word.difficulty}&word=${encodeURIComponent(result.word.word)}`);
    } else {
      navigate(result.to);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Search SpellBee">
      <button aria-label="Close search" onClick={onClose} className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-4 sm:px-5">
          <Search className="h-5 w-5 shrink-0 text-amber-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "Enter" && results[0]) go(results[0]);
            }}
            placeholder="Search pages, words or definitions…"
            className="min-w-0 flex-1 bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-500"
          />
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 text-slate-400 hover:text-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-2 sm:p-3">
          {results.length ? results.map((result, index) => (
            <button
              key={`${result.type}-${result.label}-${index}`}
              type="button"
              onClick={() => go(result)}
              className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-800/80"
            >
              <span className={result.type === "word"
                ? "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300"
                : "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300"
              }>
                {result.type === "word" ? <BookOpen className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-100">{result.label}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{result.description}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-amber-300" />
            </button>
          )) : (
            <div className="px-5 py-10 text-center text-sm text-slate-500">No SpellBee pages or words match that search.</div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-5 py-3 text-[11px] text-slate-500">
          <span>Press Enter to open the first result</span>
          <span><kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
