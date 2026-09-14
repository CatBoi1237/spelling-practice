import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, Copy, GraduationCap, Loader2, Plus, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { api, apiError } from "@/lib/api";

export default function TeacherClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [yearLevel, setYearLevel] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/teacher/classes");
      setClasses(data.classes || []);
    } catch (error) {
      toast.error(apiError(error, "Could not load your classes."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createClass = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/teacher/classes", {
        name: name.trim(),
        year_level: yearLevel.trim() || null,
      });
      setClasses((current) => [data, ...current]);
      setName("");
      setYearLevel("");
      toast.success(`${data.name} created.`);
    } catch (error) {
      toast.error(apiError(error, "Could not create the class."));
    } finally {
      setBusy(false);
    }
  };

  const copyJoin = async (item) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/class/${item.code}`);
      toast.success(`Join link copied for ${item.name}.`);
    } catch {
      toast.error("Could not copy the class link.");
    }
  };

  const toggleArchive = async (item) => {
    try {
      const { data } = await api.post(`/teacher/classes/${item.code}/archive`, {
        archived: !item.archived,
      });
      setClasses((current) => current.map((row) => row.code === item.code ? { ...row, ...data } : row));
      toast.success(data.archived ? "Class archived." : "Class reopened.");
    } catch (error) {
      toast.error(apiError(error, "Could not update the class."));
    }
  };

  const active = classes.filter((item) => !item.archived);
  const archived = classes.filter((item) => item.archived);

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-indigo-950/25 p-7 sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
          <GraduationCap className="h-3.5 w-3.5" /> Teacher · Classes
        </span>
        <h1 className="mt-4 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">Classes & rosters</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
          Create a class once, let students join with one code, then keep assignments, completion and spelling analytics tied to that roster.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={createClass} className="rounded-3xl border border-slate-800 bg-slate-900/45 p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/10 text-amber-300"><Plus className="h-5 w-5" /></span>
            <div>
              <h2 className="font-heading text-2xl font-bold text-slate-50">Create a class</h2>
              <p className="text-xs text-slate-500">Students can join without creating an account.</p>
            </div>
          </div>

          <label className="mt-6 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Class name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="Year 7 English"
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-500/50"
            />
          </label>

          <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Year / group <span className="font-normal normal-case tracking-normal text-slate-600">(optional)</span>
            <input
              value={yearLevel}
              onChange={(event) => setYearLevel(event.target.value)}
              maxLength={40}
              placeholder="Year 7 · 7B · Grade 5"
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-500/50"
            />
          </label>

          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950 hover:bg-amber-400 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create class
          </button>
        </form>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/35 p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Your classes</div>
              <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Active rosters</h2>
            </div>
            <div className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-400">{active.length} active</div>
          </div>

          {loading ? (
            <div className="grid place-items-center py-20 text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : active.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">Create your first class to get a reusable join code.</div>
          ) : (
            <div className="mt-5 space-y-3">
              {active.map((item) => (
                <ClassCard key={item.code} item={item} copyJoin={copyJoin} toggleArchive={toggleArchive} />
              ))}
            </div>
          )}
        </div>
      </section>

      {archived.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/25 p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Archived</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {archived.map((item) => (
              <ClassCard key={item.code} item={item} copyJoin={copyJoin} toggleArchive={toggleArchive} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ClassCard({ item, copyJoin, toggleArchive, compact = false }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-heading text-lg font-bold text-slate-100">{item.name}</h3>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {item.year_level && <span>{item.year_level}</span>}
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {item.student_count || 0} students</span>
            <span>{item.active_assignment_count || 0} active assignments</span>
          </div>
        </div>
        <span className="shrink-0 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 font-mono text-xs font-black tracking-widest text-amber-300">{item.code}</span>
      </div>

      {!compact && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Link to={`/teacher/classes/${item.code}`} className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-slate-950 hover:bg-amber-400">Open class</Link>
          <button type="button" onClick={() => copyJoin(item)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white"><Copy className="h-3.5 w-3.5" /> Join link</button>
          <button type="button" onClick={() => toggleArchive(item)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"><Archive className="h-3.5 w-3.5" /> Archive</button>
        </div>
      )}

      {compact && (
        <div className="mt-4 flex gap-2">
          <Link to={`/teacher/classes/${item.code}`} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300">View</Link>
          <button type="button" onClick={() => toggleArchive(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs font-bold text-emerald-300"><ArchiveRestore className="h-3.5 w-3.5" /> Reopen</button>
        </div>
      )}
    </article>
  );
}
