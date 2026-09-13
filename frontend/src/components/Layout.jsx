import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Sun, Moon, Monitor, Settings as SettingsIcon, BarChart3, Home as HomeIcon, CalendarDays, LogIn, LogOut,
  Target, Trophy, Users, Library, Medal, GraduationCap, MoreHorizontal, X, ListChecks, ScanLine,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { BeeMascot } from "@/components/BeeMascot";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/", label: "Home", icon: HomeIcon, testId: "nav-home" },
  { to: "/practice", label: "Practice", icon: Target, testId: "nav-practice" },
  { to: "/daily", label: "Daily Challenge", short: "Daily", icon: CalendarDays, testId: "nav-daily" },
  { to: "/leaderboards", label: "Leaderboards", icon: Trophy, testId: "nav-leaderboards" },
  { to: "/multiplayer", label: "Multiplayer", icon: Users, testId: "nav-multiplayer" },
  { to: "/join", label: "Join Game", short: "Join", icon: ScanLine, testId: "nav-join" },
  { to: "/word-lists", label: "My Word Lists", short: "Word Lists", icon: ListChecks, testId: "nav-word-lists" },
  { to: "/library", label: "Word Library", icon: Library, testId: "nav-library" },
  { to: "/learn", label: "Learn", icon: GraduationCap, testId: "nav-learn" },
  { to: "/progress", label: "Progress", icon: BarChart3, testId: "nav-progress" },
  { to: "/achievements", label: "Achievements", icon: Medal, testId: "nav-achievements" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, testId: "nav-settings" },
];

const MOBILE_PRIMARY = ["/", "/practice", "/daily", "/progress"];

const THEME_CYCLE = { dark: "light", light: "system", system: "dark" };
const ThemeIcon = { dark: Moon, light: Sun, system: Monitor };

function Brand() {
  return (
    <Link to="/" data-testid="brand-logo" className="group flex items-center gap-3">
      <BeeMascot size={40} mood="idle" className="drop-shadow" />
      <div className="flex flex-col leading-none">
        <span className="font-heading text-lg font-black tracking-tight text-slate-100">SPELLING BEE</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-500/80">Listen · Spell · Master</span>
      </div>
    </Link>
  );
}

function ThemeButton({ className }) {
  const { theme, setTheme } = useApp();
  const Icon = ThemeIcon[theme] || Moon;
  return (
    <button
      data-testid="theme-toggle"
      onClick={() => setTheme(THEME_CYCLE[theme] || "dark")}
      className={cn("grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-amber-500/40 hover:text-amber-400", className)}
      aria-label={`Theme: ${theme}. Click to change.`}
      title={`Theme: ${theme}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function AccountChip({ compact }) {
  const { user, logout, playerName } = useAuth();
  const navigate = useNavigate();
  if (user) {
    return (
      <button
        data-testid="sign-out-button"
        onClick={async () => {
          await logout();
          navigate("/");
        }}
        className={cn("flex w-full items-center gap-2 whitespace-nowrap rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-amber-500/40 hover:text-amber-300", compact && "w-auto px-2.5")}
        title="Sign out"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500 text-[11px] font-black text-slate-950">{user.name.charAt(0).toUpperCase()}</span>
        {!compact && <span className="truncate">{user.name}</span>}
        <LogOut className="h-3.5 w-3.5 text-slate-500" />
      </button>
    );
  }
  return (
    <Link
      to="/signin"
      data-testid="sign-in-link"
      className={cn("flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-amber-500/40 hover:text-amber-300", compact && "px-2.5")}
    >
      <LogIn className="h-3.5 w-3.5 shrink-0" /> Sign in
      {!compact && <span className="truncate text-slate-600">· {playerName.length > 12 ? playerName.slice(0, 11) + "…" : playerName}</span>}
    </Link>
  );
}

export default function Layout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const location = useLocation();
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  const focusMode = location.pathname === "/practice" && location.search.includes("mode=");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside
        data-testid="sidebar"
        className="honeycomb fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-slate-950/90 backdrop-blur-xl lg:flex"
      >
        <div className="px-5 pb-4 pt-6"><Brand /></div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, testId }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={testId}
              end={to === "/"}
              className={({ isActive }) => cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {to === "/join" && (
                <span className="ml-auto rounded-full border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-indigo-300">Code</span>
              )}
              {to === "/word-lists" && (
                <span className="ml-auto rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-300">New</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-slate-800 p-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1"><AccountChip /></div>
            <ThemeButton />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/85 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Brand />
          <div className="flex items-center gap-2">
            <AccountChip compact />
            <ThemeButton />
          </div>
        </div>
      </header>

      {!online && (
        <div data-testid="offline-banner" className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-200 lg:pl-72">
          You're offline — practice still works. Daily, multiplayer and leaderboards will reconnect automatically.
        </div>
      )}

      <main className={cn("mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-8 sm:pt-10 lg:pb-12 lg:pl-72 lg:pr-10", focusMode && "pb-8")}>
        <div key={location.pathname} className="page-enter"><Outlet /></div>
      </main>

      {!focusMode && (
        <nav
          data-testid="mobile-nav"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Mobile"
        >
          <div className="flex items-stretch justify-around">
            {NAV.filter((nav) => MOBILE_PRIMARY.includes(nav.to)).map(({ to, label, short, icon: Icon, testId }) => (
              <NavLink
                key={to}
                to={to}
                data-testid={`${testId}-mobile`}
                end={to === "/"}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) => cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", isActive ? "text-amber-400" : "text-slate-400")}
              >
                <Icon className="h-5 w-5" />
                {short || label}
              </NavLink>
            ))}
            <button
              data-testid="nav-more-mobile"
              onClick={() => setMoreOpen((open) => !open)}
              className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", moreOpen ? "text-amber-400" : "text-slate-400")}
            >
              {moreOpen ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
              More
            </button>
          </div>
        </nav>
      )}

      {moreOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-slate-950/60" />
          <div data-testid="mobile-more-sheet" className="absolute inset-x-3 bottom-20 grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            {NAV.filter((nav) => !MOBILE_PRIMARY.includes(nav.to)).map(({ to, label, short, icon: Icon, testId }) => (
              <NavLink
                key={to}
                to={to}
                data-testid={`${testId}-more`}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) => cn(
                  "relative flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-[11px] font-semibold",
                  isActive ? "bg-amber-500/15 text-amber-300" : "text-slate-300 hover:bg-slate-800"
                )}
              >
                <Icon className="h-5 w-5" />
                {short || label}
                {to === "/join" && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-400" />}
                {to === "/word-lists" && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400" />}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
