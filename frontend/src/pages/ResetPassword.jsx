import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { api, apiError, setToken } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is missing its security token.");
      return;
    }

    if (password.length < 6) {
      setError("Your password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }

    setBusy(true);

    try {
      await api.post("/auth/reset-password", {
        token,
        password,
      });

      // Any old login token is now invalid.
      setToken(null);

      setComplete(true);
      toast.success("Password reset successfully.");
    } catch (err) {
      setError(apiError(err, "Could not reset your password."));
    } finally {
      setBusy(false);
    }
  };

  if (complete) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950 p-7 text-center sm:p-9">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />

          <h1 className="mt-5 font-heading text-3xl font-black text-slate-50">
            Password changed
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Your new password is ready. For security, your previous login sessions have been signed out.
          </p>

          <Link
            to="/signin"
            className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-400"
          >
            Sign in with new password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/70 to-slate-950 p-7 sm:p-9">
        <KeyRound className="h-9 w-9 text-amber-400" />

        <h1 className="mt-5 font-heading text-3xl font-black tracking-tight text-slate-50">
          Choose a new password
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Enter a new password for your SpellBee account.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500/80">
              New password
            </span>
            <input
              type="password"
              value={password}
              minLength={6}
              required
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-amber-500/40 transition focus:border-amber-500/50 focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-500/80">
              Confirm password
            </span>
            <input
              type="password"
              value={confirm}
              minLength={6}
              required
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Type it again"
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none ring-amber-500/40 transition focus:border-amber-500/50 focus:ring-2"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" />
            {busy ? "Resetting…" : "Reset password"}
          </button>

          <Link
            to="/signin"
            className="block text-center text-sm font-semibold text-slate-400 hover:text-amber-300"
          >
            ← Back to sign in
          </Link>
        </form>
      </div>
    </div>
  );
}
