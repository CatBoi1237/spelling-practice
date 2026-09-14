import { useEffect, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";

export default function PwaUpdatePrompt() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const show = () => setReady(true);
    window.addEventListener("spellbee:update-ready", show);
    return () => window.removeEventListener("spellbee:update-ready", show);
  }, []);

  if (!ready) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-[90] mx-auto max-w-xl rounded-2xl border border-amber-500/30 bg-slate-900/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0 lg:w-[420px]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-heading text-lg font-bold text-slate-50">SpellBee just updated</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            A newer version is ready. Refresh once to load the latest features and fixes.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400"
          >
            <RefreshCw className="h-4 w-4" /> Refresh now
          </button>
        </div>
        <button
          type="button"
          aria-label="Dismiss update notice"
          onClick={() => setReady(false)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
