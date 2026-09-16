import { useNavigate } from "react-router-dom";

export default function TopicPackCard({ pack, progress }) {
  const navigate = useNavigate();
  const start = (focus = "all") => navigate(`/practice?mode=topic&topic=${pack.id}&difficulty=mixed&focus=${focus}`);
  const button = "min-h-[44px] rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <article className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <h3 className="font-heading text-lg font-bold text-slate-100">{pack.title}</h3>
      <p className="mt-2 text-sm text-slate-400">{pack.description}</p>
      <p className="mt-3 text-xs text-amber-300">{progress.total} words · Mixed levels</p>
      <label className="mt-4 text-xs text-slate-300">
        {progress.mastered.length === progress.total ? "Pack mastered!" : `${progress.mastered.length} of ${progress.total} mastered`}
        <progress aria-label={`${pack.title} mastery`} value={progress.mastered.length} max={progress.total} className="mt-2 block h-2 w-full accent-amber-500" />
      </label>
      <p className="mt-2 text-xs text-slate-500">{progress.attempted.length} tried · {progress.missed.length} to review</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <button type="button" data-testid={`topic-${pack.id}`} onClick={() => start()} className="min-h-[44px] rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400">Practise full pack</button>
        <button type="button" disabled={!progress.unmastered.length} onClick={() => start("unmastered")} className={button}>Unmastered ({progress.unmastered.length})</button>
        <button type="button" disabled={!progress.missed.length} onClick={() => start("missed")} className={button}>Review misses ({progress.missed.length})</button>
        <button type="button" onClick={() => navigate(`/library?topic=${pack.id}`)} className={button}>Browse words</button>
      </div>
    </article>
  );
}
