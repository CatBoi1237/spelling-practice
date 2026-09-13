import { Crown, Medal, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const CONFETTI = Array.from({ length: 32 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 8) * 0.11}s`,
  duration: `${2.7 + (index % 5) * 0.35}s`,
  rotate: `${(index * 47) % 180}deg`,
}));

export function ConfettiBurst({ active = true }) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {CONFETTI.map((piece, index) => (
        <span
          key={index}
          className={cn(
            "confetti-piece absolute -top-6 h-3 w-2 rounded-sm",
            index % 5 === 0 && "bg-amber-300",
            index % 5 === 1 && "bg-emerald-400",
            index % 5 === 2 && "bg-indigo-400",
            index % 5 === 3 && "bg-rose-400",
            index % 5 === 4 && "bg-sky-400"
          )}
          style={{
            left: piece.left,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            transform: `rotate(${piece.rotate})`,
          }}
        />
      ))}
    </div>
  );
}

const PLACE_META = [
  { emoji: "🥇", label: "1st", height: "sm:min-h-[190px]", ring: "border-amber-400/50 bg-amber-500/10" },
  { emoji: "🥈", label: "2nd", height: "sm:min-h-[155px]", ring: "border-slate-500/50 bg-slate-500/10" },
  { emoji: "🥉", label: "3rd", height: "sm:min-h-[135px]", ring: "border-orange-500/40 bg-orange-500/10" },
];

export function Podium({ entries = [], scoreLabel = "points" }) {
  const top = entries.slice(0, 3);
  if (!top.length) return null;

  const visualOrder = top.length === 1 ? [0] : top.length === 2 ? [1, 0] : [1, 0, 2];

  return (
    <div className="grid items-end gap-3 sm:grid-cols-3">
      {visualOrder.map((index) => {
        const entry = top[index];
        const meta = PLACE_META[index];
        return (
          <div
            key={entry.id || entry.player_id || entry.name || index}
            className={cn(
              "podium-rise relative flex flex-col items-center justify-end overflow-hidden rounded-3xl border p-5 text-center",
              meta.height,
              meta.ring,
              index === 0 && "sm:order-none"
            )}
            style={{ animationDelay: `${index * 0.12}s` }}
          >
            {index === 0 && <Crown className="absolute right-4 top-4 h-5 w-5 text-amber-300" />}
            <div className="text-4xl">{meta.emoji}</div>
            <div className="mt-3 max-w-full truncate font-heading text-xl font-black text-slate-50">
              {entry.name}
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-amber-300">
              {Number(entry.score ?? entry.points ?? 0).toLocaleString()}
              <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {scoreLabel}
              </span>
            </div>
            <div className="mt-3 rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {meta.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EndgameHero({ eyebrow, title, subtitle, icon = Trophy, children, celebrate = true }) {
  const Icon = icon;
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-slate-900 to-indigo-950/50 p-6 shadow-2xl shadow-black/20 sm:p-9">
      <ConfettiBurst active={celebrate} />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-400/30 bg-amber-500/15 text-amber-300">
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-amber-300/80">
              <Sparkles className="h-3.5 w-3.5" /> {eyebrow}
            </div>
            <h1 className="mt-1 font-heading text-3xl font-black tracking-tight text-slate-50 sm:text-5xl">
              {title}
            </h1>
            {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  );
}

export function HighlightCard({ icon = Medal, label, value, detail, accent = "text-amber-300" }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
        <Icon className={cn("h-4 w-4", accent)} />
      </div>
      <div className={cn("mt-2 font-heading text-2xl font-black", accent)}>{value}</div>
      {detail && <div className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</div>}
    </div>
  );
}
