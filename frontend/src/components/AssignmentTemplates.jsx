import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function AssignmentTemplates({ values, onApply }) {
  const { settings, updateSettings } = useApp();
  const { user } = useAuth();
  const key = user?.id;
  const all = settings.assignmentTemplates || {};
  const rows = all[key] || [];
  const save = () => { if (!values.title.trim()) { toast.error("Enter an assignment title first."); return; } updateSettings({ assignmentTemplates: { ...all, [key]: [...rows, { ...values, id: crypto.randomUUID(), updatedAt: new Date().toISOString() }] } }); toast.success("Template saved. Reusing it leaves the due date blank for you to set."); };
  return <section className="tool-card"><h2 className="font-bold">Reusable assignment templates</h2><button type="button" className="tool-button" onClick={save}>Save current form as template</button>{rows.filter(row => !row.deleted).map(row => <div className="flex flex-wrap gap-2" key={row.id}><button type="button" className="tool-button" onClick={() => onApply(row)}>Use {row.title}</button><button type="button" className="tool-button" aria-label={`Remove template ${row.title}`} onClick={() => updateSettings({ assignmentTemplates: { ...all, [key]: rows.map(r => r.id === row.id ? { ...r, deleted: true, updatedAt: new Date().toISOString() } : r) } })}>Remove template</button></div>)}</section>;
}
