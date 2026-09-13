import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISSED_KEY = "spellbee.pwaInstallDismissed.v1";

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return undefined;

    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    const dismissedRecently = dismissedAt && Date.now() - dismissedAt < 14 * 24 * 60 * 60 * 1000;
    if (dismissedRecently) return undefined;

    const onPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
      localStorage.removeItem(DISMISSED_KEY);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !installEvent) return null;

  const install = async () => {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice?.outcome === "accepted") {
      setVisible(false);
      setInstallEvent(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <aside className="fixed bottom-24 left-3 right-3 z-[60] mx-auto max-w-md rounded-2xl border border-amber-500/35 bg-slate-950/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl lg:bottom-6 lg:left-auto lg:right-6">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-800 hover:text-slate-200"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-9">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Install SpellBee</div>
        <h2 className="mt-1 font-heading text-xl font-black text-slate-50">Put the bee on your home screen</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Open SpellBee like an app and keep previously opened practice pages available when your connection drops.
        </p>
      </div>

      <button
        type="button"
        onClick={install}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400"
      >
        <Download className="h-4 w-4" /> Install SpellBee
      </button>
    </aside>
  );
}
