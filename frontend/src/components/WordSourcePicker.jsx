import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, ListPlus, LockKeyhole } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { getCustomWordLists } from "@/lib/customWordLists";

export default function WordSourcePicker({ selectedId, onChange }) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [lists, setLists] = useState(() => getCustomWordLists());

  const requestedListId = searchParams.get("list");

  const refresh = () => setLists(getCustomWordLists());

  useEffect(() => {
    const onStorage = () => refresh();
    window.addEventListener("spellbee:word-lists-changed", onStorage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("spellbee:word-lists-changed", onStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!user || !requestedListId) return;
    const exists = lists.some((item) => item.id === requestedListId);
    if (exists && selectedId !== requestedListId) {
      onChange(requestedListId);
    }
  }, [user, requestedListId, lists, selectedId, onChange]);

  const selected = useMemo(
    () => lists.find((item) => item.id === selectedId) || null,
    [lists, selectedId]
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500/80">
            <BookOpen className="h-3.5 w-3.5" /> Word source
          </div>
          <h2 className="mt-2 font-heading text-xl font-bold text-slate-100">
            Built-in words or your own list
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            One selection is used for whichever Race or Classroom game you host next.
          </p>
        </div>

        {user ? (
          <Link
            to="/word-lists"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/15"
          >
            <ListPlus className="h-4 w-4" /> Manage lists
          </Link>
        ) : (
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white"
          >
            <LockKeyhole className="h-4 w-4" /> Sign in for custom lists
          </Link>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[180px_1fr] sm:items-center">
        <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Use for next game
        </label>

        <select
          value={user ? selectedId || "" : ""}
          disabled={!user}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-amber-500/40 focus:border-amber-500/50 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Built-in SpellBee words</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name} — {list.words.length} words
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
          <div className="font-bold text-amber-300">Custom list selected: {selected.name}</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            This list has {selected.words.length} words. The Words and Difficulty controls below are ignored while this custom list is selected.
          </p>
        </div>
      )}
    </section>
  );
}
