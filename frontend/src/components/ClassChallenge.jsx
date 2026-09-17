import { useState } from "react";
import { api, apiError } from "@/lib/api";

export default function ClassChallenge({ room, teacher = false, onSaved }) {
  const [title, setTitle] = useState(room.challenge?.title || "Together we can!");
  const [target, setTarget] = useState(room.challenge?.target || 25), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const challenge = room.challenge;
  const save = async e => { e.preventDefault(); setBusy(true); setError(""); try { const { data } = await api.put(`/teacher/classes/${room.code}/challenge`, { title, target: Number(target) }); onSaved(data); } catch (e) { setError(apiError(e, "Could not save the challenge.")); } finally { setBusy(false); } };
  if (!teacher && !challenge) return null;
  return <section className="tool-card"><h2 className="text-2xl font-bold">Class challenge</h2>{challenge && <><h3>{challenge.title}</h3><p>{challenge.completed} / {challenge.target} assignment completions</p><progress className="w-full accent-amber-400" aria-label="Class challenge progress" value={Math.min(challenge.completed, challenge.target)} max={challenge.target} />{challenge.completed >= challenge.target && <p>Goal reached—well done, class!</p>}</>}<p className="my-2 text-sm">Each roster member's completed assignment counts once, including earlier assignments. Repeat attempts do not add completions.</p>{teacher && <form onSubmit={save} className="flex flex-wrap gap-3"><label>Challenge title<input className="tool-input" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} required /></label><label>Completion goal<input className="tool-input" type="number" min="1" max="10000" value={target} onChange={e => setTarget(e.target.value)} required /></label><button className="tool-button" disabled={busy}>{busy ? "Saving…" : "Save class goal"}</button>{error && <p role="alert">{error}</p>}</form>}</section>;
}
