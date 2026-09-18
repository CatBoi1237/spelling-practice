import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { templateDeadlineLabel } from "@/lib/assignmentTemplates";

export default function AssignmentTemplates({ values, onApply }) {
  const { settings, updateSettings } = useApp();
  const { user, isTeacher } = useAuth();
  const [selected, setSelected] = useState(null);
  const [dueDays, setDueDays] = useState("7");
  const [dueTime, setDueTime] = useState("16:00");
  const key = user?.id;
  const all = settings.assignmentTemplates || {};
  const rows = all[key] || [];
  if (!key || !isTeacher) return null;
  const replace = next => updateSettings({ assignmentTemplates: { ...all, [key]: next } });
  const save = (asNew = false) => {
    if (!values.title.trim()) { toast.error("Enter an assignment title first."); return; }
    if (dueDays && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) { toast.error("Choose a valid due time."); return; }
    const id = !asNew && selected && rows.some(r => r.id === selected && !r.deleted) ? selected : crypto.randomUUID();
    const template = { ...values, id, dueDays: dueDays ? Number(dueDays) : null, dueTime: dueDays ? dueTime : null, updatedAt: new Date().toISOString() };
    replace(rows.some(r => r.id === id) ? rows.map(r => r.id === id ? template : r) : [...rows, template]);
    setSelected(id); toast.success("Template saved. Each reuse calculates a fresh due date for you to review.");
  };
  const archive = (id, deleted) => {
    replace(rows.map(r => r.id === id ? { ...r, deleted, updatedAt: new Date().toISOString() } : r));
    if (selected === id) setSelected(null);
  };
  return <section className="tool-card space-y-3">
    <h2 className="font-bold">Reusable assignment templates</h2>
    <p>Save the current title, word source, count and attempts. Reusing a template fills the form; review it before creating an assignment.</p>
    <div className="flex flex-wrap gap-3">
      <label>When reused, due in<select className="tool-input" value={dueDays} onChange={e => setDueDays(e.target.value)}><option value="">Set manually</option>{[1, 2, 3, 5, 7, 14, 21, 30].map(n => <option key={n} value={n}>{n} day{n === 1 ? "" : "s"}</option>)}</select></label>
      {dueDays && <label>At local time<input className="tool-input" type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} /></label>}
    </div>
    <button type="button" className="tool-button" onClick={() => save()}>{selected ? "Update loaded template" : "Save current form as template"}</button>
    {selected && <button type="button" className="tool-button" onClick={() => save(true)}>Save as a new template</button>}
    {rows.filter(row => !row.deleted).map(row => <article key={row.id} className="rounded-xl border border-slate-600 p-3">
      <h3 className="font-bold">{row.title}</h3><p>{templateDeadlineLabel(row)}</p>
      <button type="button" className="tool-button" onClick={() => { setSelected(row.id); setDueDays(row.dueDays ? String(row.dueDays) : ""); setDueTime(row.dueTime || "16:00"); onApply(row); }}>Use {row.title}</button>
      <button type="button" className="tool-button" aria-label={`Archive template ${row.title}`} onClick={() => archive(row.id, true)}>Archive template</button>
    </article>)}
    {rows.some(row => row.deleted) && <details><summary>Archived templates</summary>{rows.filter(row => row.deleted).map(row => <p key={row.id}>{row.title} <button type="button" className="tool-button" onClick={() => archive(row.id, false)}>Restore {row.title}</button></p>)}</details>}
  </section>;
}
