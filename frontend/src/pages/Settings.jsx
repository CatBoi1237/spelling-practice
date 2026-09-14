import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RotateCcw, PlayCircle, Download, LogIn, LogOut, Sun, Moon, Monitor, CloudUpload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { resetAll, exportAll, DEFAULT_STATS } from "@/lib/storage";
import { speak, VOICE_LANGS } from "@/lib/speech";
import { DIFFICULTY_META } from "@/data/words";
import { Eyebrow } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { apiError } from "@/lib/api";

export default function Settings() {
  const { settings, updateSettings, voices, theme, setTheme, updateStats } = useApp();
  const { user, logout, playerName, renameGuest, syncNow, syncing, lastSync, switchAccountType } = useAuth();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const [guestName, setGuestName] = useState(playerName);
  const [confirmType, setConfirmType] = useState(null);
  const [switchingType, setSwitchingType] = useState(false);

  const changeType = async () => {
    setSwitchingType(true);
    try {
      await switchAccountType(confirmType);
      toast.success(`Switched to ${confirmType === "teacher" ? "Teacher" : "Student"}.`);
      setConfirmType(null);
      navigate(confirmType === "teacher" ? "/teacher" : "/my-classes");
    } catch (error) {
      toast.error(apiError(error, error.message || "Could not switch account type."));
    } finally {
      setSwitchingType(false);
    }
  };

  const voiceOpts = { rate: settings.rate, voiceName: settings.voiceName, voiceLang: settings.voiceLang };
  const englishVoices = voices.filter((v) => /^en/i.test(v.lang));
  const filteredVoices = settings.voiceLang && settings.voiceLang !== "auto"
    ? englishVoices.filter((v) => v.lang.replace("_", "-").toLowerCase() === settings.voiceLang.toLowerCase())
    : englishVoices;

  const doReset = () => {
    resetAll();
    updateStats({ ...DEFAULT_STATS });
    setConfirmReset(false);
    toast.success("All progress has been cleared.");
  };

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `spelling-bee-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Progress exported.");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Eyebrow>Preferences</Eyebrow>
        <h1 className="mt-2 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">Settings</h1>
      </header>

      <Section title="Appearance">
        <Row label="Theme" hint="System follows your device preference">
          <Segmented
            testId="settings-theme"
            options={[["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Monitor]]}
            value={theme}
            onChange={setTheme}
          />
        </Row>
      </Section>

      <Section title="Audio">
        <Row label="Accent" hint="Preferred English variety for the speaking voice">
          <Segmented testId="settings-lang" options={VOICE_LANGS.map((l) => [l.id, l.id === "auto" ? "Auto" : l.id.replace("en-", "")])} value={settings.voiceLang || "auto"} onChange={(v) => updateSettings({ voiceLang: v, voiceName: null })} />
        </Row>
        <Row label="Voice" hint={`${filteredVoices.length} matching voice${filteredVoices.length === 1 ? "" : "s"} on this device`}>
          <select
            data-testid="settings-voice-select"
            value={settings.voiceName || ""}
            onChange={(e) => updateSettings({ voiceName: e.target.value || null })}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/40 sm:w-64"
          >
            <option value="">Best available</option>
            {(filteredVoices.length ? filteredVoices : englishVoices).map((v) => (
              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>
        </Row>
        <Row label="Speech speed" hint="Default for word & sentence playback">
          <Segmented testId="settings-speed" options={[["verySlow", "Very slow"], ["slow", "Slow"], ["normal", "Normal"], ["fast", "Fast"]]} value={settings.rate} onChange={(v) => updateSettings({ rate: v })} />
        </Row>
        <Row label="Preview voice">
          <button data-testid="settings-test-voice" onClick={() => speak("Your word is: accommodate. The hotel can accommodate two hundred guests.", voiceOpts)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-amber-500/40 hover:text-amber-300">
            <PlayCircle className="h-4 w-4" /> Test voice
          </button>
        </Row>
        <ToggleRow testId="settings-sound-effects" label="Sound effects" hint="Correct, incorrect, timer and achievement sounds" checked={settings.soundEffects} onChange={(v) => updateSettings({ soundEffects: v })} />
        <ToggleRow testId="settings-autoplay" label="Auto-play word" hint="Speak each new word automatically" checked={settings.autoPlay} onChange={(v) => updateSettings({ autoPlay: v })} />
      </Section>

      <Section title="Practice">
        <Row label="Default difficulty">
          <Segmented testId="settings-difficulty" options={Object.entries(DIFFICULTY_META).map(([id, m]) => [id, m.label])} value={settings.preferredDifficulty} onChange={(v) => updateSettings({ preferredDifficulty: v })} />
        </Row>
        <Row label="Default session length" hint="Used by Classic and the Start Practice button">
          <Segmented testId="settings-length" options={[[5, "5"], [10, "10"], [15, "15"], [20, "20"], [30, "30"]]} value={Number(settings.defaultLength) || 10} onChange={(v) => updateSettings({ defaultLength: v })} />
        </Row>
        <ToggleRow testId="settings-autoadvance" label="Auto-advance on correct" hint="Move on automatically after a correct answer" checked={settings.autoAdvance} onChange={(v) => updateSettings({ autoAdvance: v })} />
        <ToggleRow testId="settings-show-definitions" label="Show definitions" hint="Display the definition in answer feedback" checked={settings.showDefinitions !== false} onChange={(v) => updateSettings({ showDefinitions: v })} />
        <ToggleRow testId="settings-show-tips" label="Show spelling tips" hint="Display the memory tip after a miss" checked={settings.showTips !== false} onChange={(v) => updateSettings({ showTips: v })} />
      </Section>

      <Section title="Account">
        {user ? (
          <>
          <Row label="Account type" hint={`Currently ${user.account_type === "teacher" ? "Teacher" : "Student"}. Switch whenever you need the other workspace.`}>
            <button type="button" data-testid="settings-switch-account-type" onClick={() => setConfirmType(user.account_type === "teacher" ? "student" : "teacher")} className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200">
              Switch to {user.account_type === "teacher" ? "Student" : "Teacher"}
            </button>
          </Row>
          {confirmType && <div role="dialog" aria-label="Confirm account type switch" className="rounded-xl border border-amber-500/30 bg-slate-950 p-5">
            <h3 className="font-bold text-slate-50">Switch to {confirmType === "teacher" ? "Teacher" : "Student"}?</h3>
            <p className="mt-2 text-sm text-slate-300">{confirmType === "teacher" ? "Teacher tools will open and Student class and assignment options will be hidden." : "Student class and assignment options will open and Teacher tools will be hidden."} Your profile, progress, achievements, saved words and synced word lists stay with this account. Classes, assignments, reports, memberships and submission history remain stored and reappear when you switch back. We will sync your progress before changing roles.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" data-testid="settings-switch-confirm" disabled={switchingType} onClick={changeType} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{switchingType ? "Switching…" : "Confirm switch"}</button>
              <button type="button" disabled={switchingType} onClick={() => setConfirmType(null)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200">Cancel</button>
            </div>
          </div>}
          <Row label="Cloud sync" hint={lastSync ? `Last synced ${new Date(lastSync).toLocaleString()}` : "Progress, streaks and mistakes sync to your account"}>
            <button data-testid="settings-sync-now" disabled={syncing} onClick={async () => { const ok = await syncNow(); ok ? toast.success("Progress synced.") : toast.error("Sync failed — we'll retry after your next session."); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />} Sync now
            </button>
          </Row>
          <Row label={user.name} hint={user.email}>
            <button data-testid="settings-logout" onClick={async () => { await logout(); toast.success("Signed out."); navigate("/"); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-rose-500/40 hover:text-rose-300">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </Row>
          </>
        ) : (
          <>
            <Row label="Display name" hint="Shown on leaderboards and in multiplayer rooms">
              <div className="flex gap-2">
                <input data-testid="settings-guest-name" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={24} className="w-44 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/40" />
                <button data-testid="settings-save-name" onClick={() => { renameGuest(guestName); toast.success("Name updated."); }} className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950">Save</button>
              </div>
            </Row>
            <Row label="Sign in" hint="Optional — keeps your progress and streaks safe across devices">
              <Link to="/signin" data-testid="settings-signin" className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"><LogIn className="h-4 w-4" /> Sign in / Sign up</Link>
            </Row>
          </>
        )}
      </Section>

      <Section title="Data">
        <Row label="Export progress" hint="Download everything as JSON">
          <button data-testid="settings-export" onClick={doExport} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-amber-500/40 hover:text-amber-300"><Download className="h-4 w-4" /> Export</button>
        </Row>
        <Row label="Reset all progress" hint="Clears stats, streaks, mistakes, achievements and history">
          {confirmReset ? (
            <div className="flex gap-2">
              <button data-testid="settings-reset-confirm" onClick={doReset} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400">Yes, reset</button>
              <button onClick={() => setConfirmReset(false)} className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200">Cancel</button>
            </div>
          ) : (
            <button data-testid="settings-reset-button" onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20"><RotateCcw className="h-4 w-4" /> Reset progress</button>
          )}
        </Row>
      </Section>

      <Section title="Keyboard shortcuts">
        <ul className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          {[["Space", "play the word"], ["R", "replay (when not typing)"], ["Enter", "submit / next"], ["Esc", "exit session"]].map(([k, d]) => (
            <li key={k} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"><kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-amber-300">{k}</kbd> — {d}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/80">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="flex flex-col justify-between gap-3 border-b border-slate-800 pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center">
      <div>
        <div className="text-sm font-semibold text-slate-100">{label}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Segmented({ testId, options, value, onChange }) {
  return (
    <div className="flex flex-wrap overflow-hidden rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold">
      {options.map(([id, label, Icon]) => (
        <button key={id} data-testid={`${testId}-${id}`} onClick={() => onChange(id)} className={cn("inline-flex items-center gap-1.5 px-3.5 py-2 transition-colors", value === id ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-amber-300")}>
          {Icon && <Icon className="h-3.5 w-3.5" />} {label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({ testId, label, hint, checked, onChange }) {
  return (
    <Row label={label} hint={hint}>
      <button data-testid={testId} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative h-6 w-11 shrink-0 rounded-full border transition-colors", checked ? "border-amber-500/60 bg-amber-500" : "border-slate-700 bg-slate-800")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
      </button>
    </Row>
  );
}
