import { useState } from "react";
import { api, apiError } from "@/lib/api";

export default function ClassChallenge({ room, teacher = false, onSaved }) {
  const [title, setTitle] = useState(room.challenge?.title || "Together we can!");
  const [target, setTarget] = useState(room.challenge?.target || 25);
  const [restart, setRestart] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const challenge = room.challenge;
  const save = async e => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      const { data } = await api.put(`/teacher/classes/${room.code}/challenge`, { title, target: Number(target), restart });
      onSaved(data); setRestart(false);
    } catch (e) { setError(apiError(e, "Could not save the challenge.")); }
    finally { setBusy(false); }
  };
  if (!teacher && !challenge) return null;
  return <section className="tool-card space-y-3">
    <h2 className="text-2xl font-bold">Class challenge</h2>
    {challenge && <>
      <h3>{challenge.title}</h3><p>{challenge.completed} / {challenge.target} assignment completions</p>
      <progress className="w-full accent-amber-400" aria-label="Class challenge progress" value={Math.min(challenge.completed, challenge.target)} max={challenge.target} />
      {challenge.completed >= challenge.target && <p>Goal reached—well done, class!</p>}
      {challenge.started_at && <p>Started {new Date(challenge.started_at).toLocaleString()}</p>}
    </>}
    <p className="text-sm">{challenge?.started_at ? "Only submissions since this goal started count. A member can complete an older assignment again to contribute to the new goal." : "This goal includes earlier assignment completions."} Each current roster member counts once per assignment within the goal. Further repeat attempts do not add completions.</p>
    {teacher && <form onSubmit={save} className="space-y-3">
      <fieldset disabled={busy} className="space-y-3">
        <div className="flex flex-wrap gap-3"><label>Challenge title<input className="tool-input" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} required /></label>
        <label>Completion goal<input className="tool-input" type="number" min="1" max="10000" value={target} onChange={e => setTarget(e.target.value)} required /></label></div>
        <label className="flex items-start gap-2"><input type="checkbox" checked={restart} onChange={e => setRestart(e.target.checked)} />Start a fresh goal from now</label>
        {restart && <p role="status">The new goal starts at zero. Your current goal and its final count will be saved below. All assignments and student results are retained.</p>}
        <button className="tool-button" disabled={busy}>{busy ? "Saving…" : restart ? "Save and start fresh goal" : "Save class goal"}</button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>}
    {!!challenge?.history?.length && <details><summary>Previous class goals ({challenge.history.length})</summary><ol className="space-y-3">{[...challenge.history].reverse().map((goal, i) => <li key={`${goal.ended_at}:${i}`}><strong>{goal.title}</strong> · {goal.completed} / {goal.target} completions · {goal.completed >= goal.target ? "Goal reached" : "Finished"}<p>Ended {new Date(goal.ended_at).toLocaleString()}</p></li>)}</ol></details>}
  </section>;
}
