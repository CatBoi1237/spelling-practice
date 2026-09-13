import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }) {
  return <span className={cn("text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/80", className)}>{children}</span>;
}

export function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Card({ className, children, testId, ...rest }) {
  return (
    <div data-testid={testId} className={cn("rounded-3xl border border-slate-800 bg-slate-900/40 p-6", className)} {...rest}>
      {children}
    </div>
  );
}

export function StatCard({ testId, icon: Icon, label, value, accent = "text-amber-300", sub, className }) {
  return (
    <div data-testid={testId} className={cn("rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-slate-700", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
        {Icon && <Icon className={cn("h-4 w-4", accent)} />}
      </div>
      <div className="count-up mt-3 font-heading text-3xl font-black text-slate-50">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function PrimaryButton({ className, children, ...rest }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-amber-400 disabled:pointer-events-none disabled:opacity-40",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({ className, children, ...rest }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-amber-500/40 hover:text-amber-300 disabled:pointer-events-none disabled:opacity-40",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Pill({ className, children, ...rest }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300", className)} {...rest}>
      {children}
    </span>
  );
}

export function EmptyState({ title, body, action, mascot }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-800 p-8 text-center">
      {mascot}
      <h3 className="font-heading text-xl font-bold text-slate-100">{title}</h3>
      {body && <p className="max-w-md text-sm text-slate-400">{body}</p>}
      {action}
    </div>
  );
}
