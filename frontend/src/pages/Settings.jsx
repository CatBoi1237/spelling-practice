import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { resetAll } from "@/lib/storage";
import { speak } from "@/lib/speech";
import { toast } from "sonner";
import { RotateCcw, Volume2, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { settings, updateSettings, voices, theme, setTheme, updateStats } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);

  const testVoice = () => {
    speak("Welcome to the Spelling Bee trainer. Ready to spell?", {
      rate: settings.rate,
      voiceName: settings.voiceName,
    });
  };

  const doReset = () => {
    resetAll();
    updateStats({
      totalAttempted: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      bestStreak: 0,
      currentStreak: 0,
      highestDifficulty: null,
      wordsCompleted: 0,
    });
    setConfirmReset(false);
    toast.success("All progress has been cleared.");
  };

  const englishVoices = voices.filter((v) => /^en/i.test(v.lang));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/80">Preferences</span>
        <h1 className="mt-2 font-heading text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">Settings</h1>
      </header>

      <Section title="Audio">
        <Row label="Speech speed" hint="Applied to word & sentence playback">
          <div className="flex overflow-hidden rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold">
            {["slow", "normal", "fast"].map((r) => (
              <button
                key={r}
                data-testid={`settings-speed-${r}`}
                onClick={() => updateSettings({ rate: r })}
                className={cn(
                  "px-4 py-2 capitalize transition",
                  settings.rate === r ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-amber-300"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Voice" hint={`${englishVoices.length} English voices detected`}>
          <select
            data-testid="settings-voice-select"
            value={settings.voiceName || ""}
            onChange={(e) => updateSettings({ voiceName: e.target.value || null })}
            className="w-64 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/40"
          >
            <option value="">System default</option>
            {englishVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </Row>

        <Row label="Preview voice">
          <button
            data-testid="settings-test-voice"
            onClick={testVoice}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-amber-500/40 hover:text-amber-300"
          >
            <PlayCircle className="h-4 w-4" /> Test voice
          </button>
        </Row>

        <ToggleRow
          testId="settings-sound-effects"
          label="Sound effects"
          hint="Play a chime on correct/incorrect answers"
          checked={settings.soundEffects}
          onChange={(v) => updateSettings({ soundEffects: v })}
        />

        <ToggleRow
          testId="settings-autoplay"
          label="Auto-play word"
          hint="Speak the word automatically when a new one appears"
          checked={settings.autoPlay}
          onChange={(v) => updateSettings({ autoPlay: v })}
        />

        <ToggleRow
          testId="settings-autoadvance"
          label="Auto-advance on correct"
          hint="Skip feedback and move to the next word when correct"
          checked={settings.autoAdvance}
          onChange={(v) => updateSettings({ autoAdvance: v })}
        />
      </Section>

      <Section title="Appearance">
        <Row label="Theme">
          <div className="flex overflow-hidden rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold">
            {["dark", "light"].map((t) => (
              <button
                key={t}
                data-testid={`settings-theme-${t}`}
                onClick={() => setTheme(t)}
                className={cn(
                  "px-5 py-2 capitalize transition",
                  theme === t ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-amber-300"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Preferred difficulty">
          <div className="flex overflow-hidden rounded-full border border-slate-700 bg-slate-900 text-xs font-semibold">
            {["easy", "medium", "hard", "extreme"].map((d) => (
              <button
                key={d}
                data-testid={`settings-difficulty-${d}`}
                onClick={() => updateSettings({ preferredDifficulty: d })}
                className={cn(
                  "px-3 py-2 capitalize transition",
                  settings.preferredDifficulty === d ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-amber-300"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Data">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-100">Reset all progress</div>
            <div className="text-xs text-slate-400">Clears stats, streaks, missed words, and session history.</div>
          </div>
          {confirmReset ? (
            <div className="flex gap-2">
              <button
                data-testid="settings-reset-confirm"
                onClick={doReset}
                className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
              >
                Yes, reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              data-testid="settings-reset-button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20"
            >
              <RotateCcw className="h-4 w-4" /> Reset progress
            </button>
          )}
        </div>
      </Section>

      <Section title="Shortcuts">
        <ul className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <li className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
            <kbd className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-amber-300">Enter</kbd> — submit spelling
          </li>
          <li className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
            <Volume2 className="mr-1 inline h-3 w-3 text-amber-300" /> Tap the play button anytime to replay
          </li>
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
    <div className="flex flex-col justify-between gap-2 border-b border-slate-800 pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-center">
      <div>
        <div className="text-sm font-semibold text-slate-100">{label}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ testId, label, hint, checked, onChange }) {
  return (
    <Row label={label} hint={hint}>
      <button
        data-testid={testId}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-full border transition",
          checked ? "border-amber-500/60 bg-amber-500" : "border-slate-700 bg-slate-800"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </Row>
  );
}
