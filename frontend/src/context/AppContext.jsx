import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSettings, saveSettings, getStats, saveStats, getTheme, saveTheme } from "@/lib/storage";
import { loadVoices } from "@/lib/speech";

const AppContext = createContext(null);

function systemDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(getSettings());
  const [stats, setStats] = useState(getStats());
  const [theme, setThemeState] = useState(getTheme());
  const [resolvedTheme, setResolved] = useState(() => (getTheme() === "system" ? (systemDark() ? "dark" : "light") : getTheme()));
  const [voices, setVoices] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    loadVoices().then(setVoices);
  }, []);

  useEffect(() => {
    const apply = () => {
      const resolved = theme === "system" ? (systemDark() ? "dark" : "light") : theme;
      setResolved(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    saveTheme(theme);
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, [theme]);

  const setTheme = useCallback((t) => setThemeState(t), []);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateStats = useCallback((patch) => {
    setStats((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      saveStats(next);
      return next;
    });
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const value = useMemo(
    () => ({ settings, updateSettings, stats, updateStats, theme, setTheme, resolvedTheme, voices, tick, refresh }),
    [settings, updateSettings, stats, updateStats, theme, setTheme, resolvedTheme, voices, tick, refresh]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
