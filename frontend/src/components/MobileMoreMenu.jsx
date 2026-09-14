import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Gamepad2,
  School,
  UserRound,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

const GROUP_META = {
  learn: { icon: BookOpen, subtitle: "Practice, lessons and words" },
  compete: { icon: Gamepad2, subtitle: "Games, joining and rankings" },
  teacher: { icon: School, subtitle: "Classes, assignments and lists" },
  me: { icon: UserRound, subtitle: "Progress, profile and settings" },
};

export default function MobileMoreMenu({ open, groups, onClose }) {
  const [section, setSection] = useState(null);

  useEffect(() => {
    if (!open) setSection(null);
  }, [open]);

  if (!open) return null;

  const activeGroup = groups.find((group) => group.id === section) || null;

  return (
    <div className="fixed inset-0 z-30 lg:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <div
        data-testid="mobile-more-sheet"
        className="absolute inset-x-3 bottom-20 max-h-[72vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {activeGroup && (
              <button
                type="button"
                onClick={() => setSection(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-800 text-slate-400 hover:text-slate-100"
                aria-label="Back to categories"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <div className="truncate font-heading text-lg font-black text-slate-100">
                {activeGroup ? activeGroup.label : "More SpellBee"}
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {activeGroup ? GROUP_META[activeGroup.id]?.subtitle : "Choose a section instead of scrolling through everything."}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-800 text-slate-400 hover:text-slate-100"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!activeGroup ? (
          <div className="grid grid-cols-2 gap-3">
            {groups.map((group) => {
              const meta = GROUP_META[group.id] || {};
              const Icon = meta.icon || BookOpen;
              return (
                <button
                  key={group.id}
                  type="button"
                  data-testid={`mobile-more-group-${group.id}`}
                  onClick={() => setSection(group.id)}
                  className="group flex min-h-[118px] flex-col rounded-2xl border border-slate-800 bg-slate-950/55 p-4 text-left transition hover:border-amber-500/30 hover:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
                      <Icon className="h-5 w-5" />
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-300" />
                  </div>
                  <div className="mt-3 font-heading text-sm font-bold text-slate-100">{group.label}</div>
                  <div className="mt-1 text-[11px] leading-snug text-slate-500">{meta.subtitle}</div>
                  <div className="mt-auto pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {group.items.length} option{group.items.length === 1 ? "" : "s"}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {activeGroup.items.map(({ to, label, short, icon: Icon, testId }) => (
              <NavLink
                key={to}
                to={to}
                data-testid={`${testId}-more`}
                onClick={onClose}
                className={({ isActive }) => cn(
                  "flex min-h-[62px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors",
                  isActive
                    ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
                    : "border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-900">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">{short || label}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
