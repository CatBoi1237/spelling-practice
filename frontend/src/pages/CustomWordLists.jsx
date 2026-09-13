import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  Edit3,
  ListPlus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
  deleteCustomWordList,
  getCustomWordLists,
  isMultiplayerWordCount,
  parseCustomWords,
  saveCustomWordList,
} from "@/lib/customWordLists";

const EMPTY_FORM = {
  id: null,
  name: "",
  text: "",
};

export default function CustomWordLists() {
  const { user } = useAuth();
  const [lists, setLists] = useState(() => getCustomWordLists());
  const [form, setForm] = useState(EMPTY_FORM);

  const words = useMemo(() => parseCustomWords(form.text), [form.text]);
  const validCount = isMultiplayerWordCount(words.length);

  const refresh = () => setLists(getCustomWordLists());

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener("spellbee:word-lists-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("spellbee:word-lists-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const resetForm = () => setForm(EMPTY_FORM);

  const save = (e) => {
    e.preventDefault();

    try {
      const saved = saveCustomWordList({
        id: form.id,
        name: form.name,
        words,
      });
      refresh();
      resetForm();
      toast.success(`${saved.name} saved.`);
    } catch (e) {
      toast.error(e?.message || "Could not save this word list.");
    }
  };

  const edit = (list) => {
    setForm({
      id: list.id,
      name: list.name,
      text: list.words.join("\n"),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = (list) => {
    if (!window.confirm(`Delete “${list.name}”?`)) return;
    deleteCustomWordList(list.id);
    refresh();
    if (form.id === list.id) resetForm();
    toast.success("Word list deleted.");
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-amber-500/25 bg-slate-900/60 p-8 text-center sm:p-10">
        <ListPlus className="mx-auto h-10 w-10 text-amber-400" />
        <h1 className="mt-5 font-heading text-3xl font-black text-slate-50">
          Custom word lists
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
          Sign in before creating teacher word lists. Students can still join Classroom games without an account.
        </p>
        <Link
          to="/signin"
          className="mt-6 inline-flex rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300">
          <ListPlus className="h-3 w-3" /> Teacher tools
        </span>
        <h1 className="mt-4 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">
          Custom word lists
        </h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          Paste your own spelling words, save the list, then use it in Race or Classroom Mode. Lists are saved in this browser on this device.
        </p>
      </header>

      <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr]">
        <form
          onSubmit={save}
          className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-bold text-slate-50">
                {form.id ? "Edit list" : "Create a list"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Use one word per line, or separate words with commas.
              </p>
            </div>

            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                New list
              </button>
            )}
          </div>

          <label className="mt-6 block">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
              List name
            </span>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              maxLength={60}
              placeholder="Week 6 spelling"
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-amber-500/40 focus:border-amber-500/50 focus:ring-2"
            />
          </label>

          <label className="mt-5 block">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Words
            </span>
            <textarea
              value={form.text}
              onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))}
              rows={13}
              placeholder={"necessary\naccommodation\nseparate\ncalendar\nembarrass"}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              className="mt-2 w-full resize-y rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 font-mono text-sm leading-7 text-slate-100 outline-none ring-amber-500/40 focus:border-amber-500/50 focus:ring-2"
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
            <div>
              <div className={validCount ? "font-bold text-emerald-300" : "font-bold text-slate-300"}>
                {words.length} unique word{words.length === 1 ? "" : "s"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Multiplayer lists currently support exactly 5, 10, 15, or 25 words.
              </div>
            </div>
            <div className="text-xs text-slate-500">Maximum 40 characters per word</div>
          </div>

          <button
            type="submit"
            disabled={!form.name.trim() || !validCount}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {form.id ? "Save changes" : "Save word list"}
          </button>
        </form>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl font-bold text-slate-50">Saved lists</h2>
              <p className="mt-2 text-sm text-slate-500">
                Pick any saved list from the Multiplayer page.
              </p>
            </div>
            <BookOpenCheck className="h-7 w-7 text-amber-400" />
          </div>

          {lists.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center text-sm text-slate-500">
              No custom lists yet. Create your first one here.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {lists.map((list) => (
                <article
                  key={list.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-heading text-lg font-bold text-slate-100">
                        {list.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-amber-300">
                        {list.words.length} words
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => edit(list)}
                        aria-label={`Edit ${list.name}`}
                        className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:border-amber-500/40 hover:text-amber-300"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(list)}
                        aria-label={`Delete ${list.name}`}
                        className="rounded-lg border border-rose-500/25 p-2 text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {list.words.join(" · ")}
                  </p>

                  <Link
                    to={`/multiplayer?list=${encodeURIComponent(list.id)}`}
                    className="mt-4 inline-flex rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/15"
                  >
                    Use in Multiplayer
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
