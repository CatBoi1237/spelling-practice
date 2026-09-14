import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function StudentAccountGate({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <div className="py-24 text-center text-slate-400">Checking account…</div>;
  if (user?.account_type === "teacher") return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-indigo-500/25 bg-slate-900 p-8 text-center">
      <h1 className="font-heading text-3xl font-black text-slate-50">Student account required</h1>
      <p className="mt-3 text-sm text-slate-400">Class membership and assignment history are retained while you use Teacher tools.</p>
      <Link to="/settings" className="mt-6 inline-block rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950">Change account type in Settings</Link>
    </div>
  );
  return children;
}
