import { useMemo } from "react";
import { Lock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { achievementProgress } from "@/lib/achievements";
import { Eyebrow } from "@/components/ui-bits";
import { BeeMascot } from "@/components/BeeMascot";
import { cn } from "@/lib/utils";

export default function Achievements() {
  const { stats } = useApp();
  const list = useMemo(() => achievementProgress(stats), [stats]);
  const unlocked = list.filter((a) => a.unlockedAt).length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Achievements</Eyebrow>
          <h1 className="mt-2 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">Your trophy shelf</h1>
          <p className="mt-2 text-base text-slate-400">{unlocked} of {list.length} unlocked. Locked badges show how close you are.</p>
        </div>
        <BeeMascot size={80} mood={unlocked > 3 ? "cheer" : "idle"} />
      </header>

      <div data-testid="achievements-grid" className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a) => {
          const pct = Math.round((a.current / a.target) * 100);
          return (
            <div
              key={a.id}
              data-testid={`achievement-${a.id}`}
              className={cn("relative rounded-2xl border p-5 transition-colors", a.unlockedAt ? "border-amber-500/40 bg-amber-500/10" : "border-slate-800 bg-slate-900/40")}
            >
              <div className="flex items-start gap-4">
                <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl", a.unlockedAt ? "bg-amber-500/20" : "bg-slate-950/60 grayscale opacity-60")}>{a.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-heading text-lg font-bold text-slate-100">{a.title}</h3>
                    {!a.unlockedAt && <Lock className="h-3.5 w-3.5 text-slate-600" />}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-400">{a.desc}</p>
                  {a.unlockedAt ? (
                    <p className="mt-2 text-xs font-semibold text-amber-300">Unlocked {new Date(a.unlockedAt).toLocaleDateString()}</p>
                  ) : (
                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-500/70 transition-[width]" style={{ width: `${pct}%` }} /></div>
                      <div className="mt-1 text-[11px] text-slate-500">{a.current.toLocaleString()} / {a.target.toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
