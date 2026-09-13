import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, setToken } from "@/lib/api";
import { getPlayerId, getPlayerName, setPlayerName } from "@/lib/identity";
import { getSettings, getStats } from "@/lib/storage";
import { pullAndMerge, push, lastSyncedAt } from "@/lib/sync";
import { useApp } from "@/context/AppContext";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { updateStats, updateSettings, stats, settings, refresh } = useApp();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(lastSyncedAt());
  const [guestName, setGuestName] = useState(getPlayerName());
  const syncedFor = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem("sb.token.v1")) {
      setChecking(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  // Pull + merge cloud progress once per signed-in user
  useEffect(() => {
    if (!user || syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    setSyncing(true);
    pullAndMerge()
      .then(() => {
        updateStats(getStats());
        updateSettings(getSettings());
        refresh();
        setLastSync(lastSyncedAt());
      })
      .catch(() => {})
      .finally(() => setSyncing(false));
  }, [user, updateStats, updateSettings, refresh]);

  // Push after each finished session / settings change
  useEffect(() => {
    if (!user || syncedFor.current !== user.id || syncing) return;
    push().then((ok) => ok && setLastSync(lastSyncedAt()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.sessions, settings, user]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await push();
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    syncedFor.current = null;
  }, []);

  const syncNow = useCallback(async () => {
    if (!user) return false;
    setSyncing(true);
    const ok = await push();
    setSyncing(false);
    if (ok) setLastSync(lastSyncedAt());
    return ok;
  }, [user]);

  const renameGuest = useCallback((name) => {
    setPlayerName(name);
    setGuestName(getPlayerName());
  }, []);

  const value = useMemo(
    () => ({
      user,
      checking,
      syncing,
      lastSync,
      syncNow,
      login,
      register,
      logout,
      playerId: user?.id || getPlayerId(),
      playerName: user?.name || guestName,
      renameGuest,
    }),
    [user, checking, syncing, lastSync, syncNow, login, register, logout, guestName, renameGuest]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
