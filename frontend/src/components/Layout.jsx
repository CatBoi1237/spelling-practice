import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Sun, Moon, Monitor, Settings as SettingsIcon, BarChart3, Home as HomeIcon, CalendarDays, LogIn, LogOut,
  Target, Trophy, Users, Library, Medal, GraduationCap, MoreHorizontal, X, ListChecks, ScanLine, School, UserRound, Bookmark, Search, ClipboardList,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { BeeMascot } from "@/components/BeeMascot";
import GlobalSearch from "@/components/GlobalSearch";
import MobileMoreMenu from "@/components/MobileMoreMenu";
import { cn } from "@/lib/utils";

const HOME_NAV = { to: "/", label: "Home", icon: HomeIcon, testId: "nav-home" };

export const NAV_GROUPS = [
  {
    id: "learn",
    label: "Learn & practise",
    items: [
      { to: "/practice", label: "Practice", icon: Target, testId: "nav-practice" },
      { to: "/daily", label: "Daily Challenge", short: "Daily", icon: CalendarDays, testId: "nav-daily" },
      { to: "/learn", label: "Lessons", icon: GraduationCap, testId: "nav-learn" },
      { to: "/library", label: "Word Library", icon: Library, testId: "nav-library" },
      { to: "/saved-words", label: "Saved Words", short: "Saved", icon: Bookmark, testId: "nav-saved-words" },
    ],
  },
  {
    id: "compete",
    label: "Play & compete",
    items: [
      { to: "/multiplayer", label: "Multiplayer", icon: Users, testId: "nav-multiplayer" },
      { to: "/join", label: "Join Game", short: "Join", icon: ScanLine, testId: "nav-join" },
      { to: "/leaderboards", label: "Leaderboards", icon: Trophy, testId: "nav-leaderboards" },
    ],
  },
  {
    id: "teacher",
    label: "Teacher",
    items: [
      { to: "/teacher", label: "Teacher Dashboard", short: "Teacher", icon: School, testId: "nav-teacher" },
      { to: "/assignments", label: "Assignments", icon: ClipboardList, testId: "nav-assignments" },
      { to: "/word-lists", label: "Word Lists", short: "Word Lists", icon: ListChecks, testId: "nav-word-lists" },
    ],
  },
  {
    id: "me",
    label: "My SpellBee",
    items: [
      { to: "/progress", label: "Progress", icon: BarChart3, testId: "nav-progress" },
      { to: "/profile", label: "Profile", icon: UserRound, testId: "nav-profile" },
      { to: "/achievements", label: "Achievements", icon: Medal, testId: "nav-achievements" },
      { to: "/settings", label: "Settings", icon: SettingsIcon, testId: "nav-settings" },
    ],
  },
];

export const NAV = [HOME_NAV, ...NAV_GROUPS.flatMap((group) => group.items)];

const MOBILE_PRIMARY = ["/", "/practice", "/multiplayer", "/progress"];

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
        title={`Signed in as ${user.account_type === "teacher" ? "Teacher" : "Student"} · click to sign out`}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500 text-[11px] font-black text-slate-950">{user.name.charAt(0).toUpperCase()}</span>
        {!compact && (
          <span className="min-w-0 flex-1 truncate text-left">
            {user.name}
            <span className="ml-1 text-[9px] font-black uppercase tracking-wider text-slate-600">
              · {user.account_type === "teacher" ? "Teacher" : "Student"}
            </span>
          </span>
        )}
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

function NavItem({ item, onClick, compact = false }) {
  const { to, label, short, icon: Icon, testId } = item;
  return (
    <NavLink
      to={to}
      data-testid={compact ? `${testId}-more` : testId}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) => cn(
        compact
          ? "relative flex min-h-[58px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors"
          : "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
        isActive
          ? compact
            ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
            : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
          : compact
            ? "border-slate-800 bg-slate-950/50 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
            : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
      )}
    >
      <span className={cn("grid shrink-0 place-items-center", compact && "h-8 w-8 rounded-lg bg-slate-900")}>
        <Icon className={compact ? "h-4 w-4" : "h-4 w-4 shrink-0"} />
      </span>
      <span className="min-w-0 truncate">{short || label}</span>
      {!compact && to === "/join" && (
        <span className="ml-auto rounded-full border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-indigo-300">Code</span>
      )}
      {!compact && to === "/teacher" && (
        <span className="ml-auto rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-300">Teach</span>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const location = useLocation();
  const { user } = useAuth();

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

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (!typing && event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === "Escape") {
        setSearchOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const isTeacher = user?.account_type === "teacher";
  const visibleGroups = NAV_GROUPS.filter((group) => group.id !== "teacher" || isTeacher);
  const moreGroups = visibleGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !MOBILE_PRIMARY.includes(item.to)),
    }))
    .filter((group) => group.items.length);
  const focusMode = location.pathname === "/practice" && location.search.includes("mode=");
  const mobilePrimaryItems = NAV.filter((item) => MOBILE_PRIMARY.includes(item.to));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <aside
        data-testid="sidebar"
        className="honeycomb fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-slate-950/90 backdrop-blur-xl lg:flex"
      >
        <div className="px-5 pb-3 pt-6"><Brand /></div>
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5 text-left text-xs font-semibold text-slate-400 transition hover:border-amber-500/30 hover:text-slate-200"
          >
            <Search className="h-4 w-4 text-amber-400" />
            <span className="flex-1">Search SpellBee</span>
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">Ctrl K</kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
          <div className="space-y-1 py-1">
            <NavItem item={HOME_NAV} />
          </div>
          {visibleGroups.map((group) => (
            <div key={group.id} className="mt-4">
              <div className="px-3 pb-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-slate-600">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => <NavItem key={item.to} item={item} />)}
              </div>
            </div>
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
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search SpellBee"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-amber-500/40 hover:text-amber-300"
            >
              <Search className="h-4 w-4" />
            </button>
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
            {mobilePrimaryItems.map(({ to, label, short, icon: Icon, testId }) => (
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

      <MobileMoreMenu
        open={moreOpen}
        groups={moreGroups}
        onClose={() => setMoreOpen(false)}
      />
    </div>
  );
}
