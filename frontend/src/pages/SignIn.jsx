import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, Sparkles, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SignIn() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (tab === "forgot") {
        await api.post("/auth/forgot-password", { email });
        setForgotSent(true);
        return;
      }

      if (tab === "login") await login(email, password);
      else await register(email, password, name);

      toast.success("You're signed in — your streaks now sync across devices.");
      navigate("/daily");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950 p-7 sm:p-9">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300">
          <Sparkles className="h-3 w-3" /> Optional
        </span>
        <h1 className="mt-5 font-heading text-3xl font-black tracking-tight text-slate-50">Save your streak</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          You can play everything as a guest. Sign in only if you want your daily streak, scorecards and leaderboard name to follow you across devices.
        </p>

        <div className="mt-7 flex overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-sm font-semibold">
          {[
            { id: "login", label: "Sign in" },
            { id: "register", label: "Create account" },
          ].map((t) => (
            <button
              key={t.id}
              data-testid={`auth-tab-${t.id}`}
              onClick={() => {
                setTab(t.id);
                setError("");
                setForgotSent(false);
              }}
              className={cn("flex-1 px-4 py-2.5 transition", tab === t.id ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-amber-300")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "forgot" && (
          <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-slate-300">
            Enter your account email and we'll send you a secure password reset link.
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={submit}>
          {tab === "register" && (
            <Field label="Display name" testId="auth-name-input" value={name} onChange={setName} placeholder="Shown on leaderboards" />
          )}
          <Field label="Email" testId="auth-email-input" type="email" value={email} onChange={setEmail} placeholder="you@school.edu" required />
          {tab !== "forgot" && (
            <Field label="Password" testId="auth-password-input" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" required />
          )}

          {tab === "login" && (
            <button
              type="button"
              data-testid="forgot-password-button"
              onClick={() => {
                setTab("forgot");
                setError("");
                setForgotSent(false);
              }}
              className="text-sm font-semibold text-amber-400 hover:text-amber-300"
            >
              Forgot password?
            </button>
          )}

          {forgotSent && (
            <p
              data-testid="forgot-password-success"
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-200"
            >
              If an account exists for that email, we've sent a password reset link. Check your inbox and spam folder.
            </p>
          )}

          {error && (
            <p data-testid="auth-error" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            data-testid="auth-submit-button"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {tab === "forgot" ? (
              <Mail className="h-4 w-4" />
            ) : tab === "login" ? (
              <LogIn className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}

            {busy
              ? "Please wait…"
              : tab === "forgot"
                ? "Send reset link"
                : tab === "login"
                  ? "Sign in"
                  : "Create account"}
          </button>
        </form>

        <button
          data-testid="continue-as-guest-button"
          onClick={() => navigate("/daily")}
          className="mt-4 w-full text-center text-sm font-semibold text-slate-400 hover:text-amber-300"
        >
          Continue as guest →
        </button>
      </div>
    </div>
  );
}

function Field({ label, testId, value, onChange, type = "text", placeholder, required }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500/80">{label}</span>
      <input
        data-testid={testId}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-amber-500/40 transition focus:border-amber-500/50 focus:ring-2"
      />
    </label>
  );
}
