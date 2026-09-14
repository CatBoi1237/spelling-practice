import { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { apiError } from "@/lib/api";

export default function TeacherAccountGate({ children }) {
  const { user, checking, isTeacher, upgradeToTeacher } = useAuth();
  const [upgrading, setUpgrading] = useState(false);

  if (checking) {
    return (
      <div className="grid place-items-center py-24 text-slate-500">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-8 text-center sm:p-12">
        <LockKeyhole className="mx-auto h-11 w-11 text-amber-400" />
        <h1 className="mt-5 font-heading text-4xl font-black text-slate-50">Teacher account required</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
          Classroom hosting, assignments, reports and teacher word lists live inside a Teacher account. Students can still join Classroom games and complete assignments without a Teacher account.
        </p>
        <Link
          to="/signin"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
        >
          <GraduationCap className="h-4 w-4" /> Sign in or create Teacher account
        </Link>
      </div>
    );
  }

  if (!isTeacher) {
    const convert = async () => {
      setUpgrading(true);
      try {
        await upgradeToTeacher();
        toast.success("Teacher tools unlocked for this account.");
      } catch (error) {
        toast.error(apiError(error, "Could not enable Teacher tools."));
      } finally {
        setUpgrading(false);
      }
    };

    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-amber-950/20 p-8 text-center sm:p-12">
        <ShieldCheck className="mx-auto h-12 w-12 text-indigo-300" />
        <div className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">Student account</div>
        <h1 className="mt-2 font-heading text-4xl font-black text-slate-50">Enable Teacher tools?</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
          This account currently has the Student role. Converting it to a Teacher account unlocks Classroom hosting, assignment creation, reports and synced teacher word lists. This is a SpellBee account role, not school-employment verification.
        </p>
        <button
          type="button"
          onClick={convert}
          disabled={upgrading}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-black text-slate-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
          {upgrading ? "Enabling…" : "Convert to Teacher account"}
        </button>
        <p className="mt-4 text-xs text-slate-600">Teacher accounts cannot currently be switched back to Student from the app.</p>
      </div>
    );
  }

  return children;
}
