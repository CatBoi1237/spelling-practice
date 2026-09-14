import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function TeacherAccountGate({ children }) {
  const { user, checking, isTeacher } = useAuth();
  if (checking) return <div className="py-24 text-center text-slate-400">Checking account…</div>;
  if (!user || !isTeacher) return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-amber-500/25 bg-slate-900 p-8 text-center">
      <h1 className="font-heading text-3xl font-black text-slate-50">Teacher account required</h1>
      <p className="mt-3 text-sm text-slate-400">Teacher tools are available only while your account is set to Teacher. Your existing work is retained when you switch roles.</p>
      <Link to={user ? "/settings" : "/signin"} className="mt-6 inline-block rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950">
        {user ? "Change account type in Settings" : "Sign in"}
      </Link>
    </div>
  );
  return children;
}
