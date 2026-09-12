import { Link, NavLink, Outlet } from "react-router-dom";
import { Sun, Moon, Settings as SettingsIcon, BarChart3, Home as HomeIcon, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: HomeIcon, testId: "nav-dashboard" },
  { to: "/progress", label: "Progress", icon: BarChart3, testId: "nav-progress" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, testId: "nav-settings" },
];

export default function Layout() {
  const { theme, setTheme } = useApp();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 dark:bg-slate-950 dark:text-slate-100 light:bg-white light:text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <Link to="/" data-testid="brand-logo" className="group flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/40 transition group-hover:bg-amber-500/20">
              <Sparkles className="h-5 w-5 text-amber-400" />
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500/80">Spelling</span>
              <span className="font-heading text-lg font-black text-slate-100">Bee Champion</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map(({ to, label, icon: Icon, testId }) => (
              <NavLink
                key={to}
                to={to}
                data-testid={testId}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <button
            data-testid="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-amber-500/40 hover:text-amber-400"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex items-center justify-around border-t border-slate-800 md:hidden">
          {nav.map(({ to, label, icon: Icon, testId }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`${testId}-mobile`}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium",
                  isActive ? "text-amber-400" : "text-slate-400"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
