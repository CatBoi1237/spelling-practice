import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { downloadText, validatePersonalPack, importPersonalPack } from "@/lib/learningTools";

export default function PersonalPacks({ onPrint }) {
  const { settings, updateSettings } = useApp();
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const packs = settings.personalPacks || [];
  const reset = () => { setEditing(null); setTitle(""); setText(""); };
  const save = e => {
    e.preventDefault();
    try {
      const data = validatePersonalPack(title, text);
      const pack = { ...data, id: editing || crypto.randomUUID(), updatedAt: new Date().toISOString() };
      updateSettings({ personalPacks: editing ? packs.map(p => p.id === editing ? pack : p) : [...packs, pack] });
      reset(); toast.success("Pack saved. Your previous word progress is retained.");
    } catch (error) { toast.error(error.message); }
  };
  // File reading is asynchronous: stage the import in the editor rather than
  // writing an old settings snapshot over a newer cloud sync.
  const importFile = async e => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error("Choose a pack file smaller than 100 KB.");
      const pack = importPersonalPack(await file.text());
      setEditing(null); setTitle(pack.title); setText(pack.words.join("\n"));
      toast.success("Pack loaded. Review the words, then save your own copy.");
    } catch (error) { toast.error(error.message); }
  };
  return <div className="space-y-4">
    <form onSubmit={save} className="tool-card space-y-3">
      <h2 className="text-2xl font-bold">{editing ? "Edit personal pack" : "Build a personal pack"}</h2>
      <label className="block">Pack title<input className="tool-input" value={title} maxLength={80} onChange={e => setTitle(e.target.value)} required /></label>
      <label className="block">Paste homework words or words from a book<textarea className="tool-input" rows={6} maxLength={10000} value={text} onChange={e => setText(e.target.value)} required /></label>
      <p>3–50 unique words, separated by spaces, commas or new lines. Editing a pack keeps all spelling progress.</p>
      <button className="tool-button">{editing ? "Save changes" : "Save pack"}</button>
      {editing && <button type="button" className="tool-button" onClick={reset}>Cancel editing</button>}
      <label className="block">Import a SpellBee pack (JSON)<input className="tool-input" type="file" accept=".json,application/json" onChange={importFile} /></label>
    </form>
    {packs.map(p => <article className="tool-card" key={p.id}>
      <h3 className="text-xl font-bold">{p.title}</h3><p>{p.words.length} words</p>
      <Link className="tool-button" to={`/practice?mode=personal&pack=${encodeURIComponent(p.id)}&difficulty=mixed`}>Practise</Link>
      <button className="tool-button" onClick={() => { setEditing(p.id); setTitle(p.title); setText(p.words.join("\n")); }}>Edit pack</button>
      <button className="tool-button" onClick={() => downloadText("spellbee-pack.json", JSON.stringify({ format: "spellbee-pack", version: 1, title: p.title, words: p.words }, null, 2), "application/json")}>Export pack</button>
      <button className="tool-button" onClick={() => onPrint(p.id)}>Print or download</button>
    </article>)}
  </div>;
}
