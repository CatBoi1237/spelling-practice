import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSettings, saveSettings, getStats, saveStats, getTheme, saveTheme } from "@/lib/storage";
import { loadVoices } from "@/lib/speech";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(getSettings());
  const [stats, setStats] = useState(getStats());
  const [theme, setTheme] = useState(getTheme());
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    loadVoices().then(setVoices);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    saveTheme(theme);
  }, [theme]);

  const updateSettings = (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const updateStats = (patch) => {
    setStats((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      saveStats(next);
      return next;
    });
  };

  const value = useMemo(
    () => ({ settings, updateSettings, stats, updateStats, theme, setTheme, voices }),
    [settings, stats, theme, voices]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
