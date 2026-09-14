import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarClock, GraduationCap, Loader2, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getPlayerId } from "@/lib/identity";

function prettyDue(value) {
  if (!value) return "No due date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No due date" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function StudentClass() {
  const { code } = useParams();
  const classCode = (code || "").toUpperCase();
  const { user, playerName, renameGuest } = useAuth();
  const playerId = user?.id || getPlayerId();
  const [room, setRoom] = useState(null);
  const [name, setName] = useState(user?.name || playerName || "");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/classes/${classCode}`, {
        params: { player_id: playerId },
      });
      setRoom(data);
      setError("");
    } catch (err) {
      setError(apiError(err, "Class not found."));
    } finally {
      setLoading(false);
    }
  }, [classCode, playerId]);

  useEffect(() => {
    load();
  }, [load]);

  const join = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Enter your name first.");
      return;
    }
    setJoining(true);
    try {
      if (!user) renameGuest(name.trim());
      const { data } = await api.post(`/classes/${classCode}/join`, {
        player_id: playerId,
        name: name.trim(),
      });
      setRoom(data);
      toast.success(`Joined ${data.name}.`);
    } catch (err) {
      toast.error(apiError(err, "Could not join this class."));
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <div className="grid place-items-center py-24 text-slate-500"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  if (error || !room) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rose-500/25 bg-rose-500/5 p-8 text-center">
        <h1 className="font-heading text-3xl font-black text-slate-50">{error || "Class not found"}</h1>
        <Link to="/join" className="mt-6 inline-flex rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950">Back to Join</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-indigo-950/20 p-7 sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
          <GraduationCap className="h-3.5 w-3.5" /> SpellBee Class
        </span>
        <h1 className="mt-4 font-heading text-4xl font-black text-slate-50 sm:text-5xl">{room.name}</h1>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
          <span>Teacher: {room.teacher_name}</span>
          {room.year_level && <span>{room.year_level}</span>}
          <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {room.student_count} students</span>
        </div>
        <div className="mt-5 inline-flex rounded-xl border border-amber-500/20 bg-slate-950/50 px-4 py-2 font-mono text-xl font-black tracking-[0.22em] text-amber-300">{room.code}</div>
      </header>

      {!room.joined ? (
        <form onSubmit={join} className="rounded-3xl border border-slate-800 bg-slate-900/45 p-6 sm:p-8">
          <h2 className="font-heading text-2xl font-bold text-slate-50">Join this class</h2>
          <p className="mt-2 text-sm text-slate-500">Join once and your teacher can send class assignments that appear here automatically.</p>

          <label className="mt-6 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Your name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!!user}
              maxLength={24}
              placeholder="Your name"
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-emerald-500/50 disabled:opacity-60"
            />
          </label>
          {user && <p className="mt-2 text-xs text-slate-500">Using your signed-in account name.</p>}

          <button type="submit" disabled={joining || !name.trim() || room.archived} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-40">
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />} {room.archived ? "Class archived" : "Join class"}
          </button>
        </form>
      ) : (
        <>
          <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 sm:p-6">
            <div className="text-sm font-bold text-emerald-200">You’re on the roster as {room.member?.name}.</div>
            <p className="mt-1 text-xs text-slate-500">Assignments from this class will appear below. Signed-in students can use the same class from any device.</p>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">Classwork</div>
                <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Assignments</h2>
              </div>
              <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-400">{room.assignments?.length || 0}</span>
            </div>

            {room.assignments?.length ? (
              <div className="mt-5 space-y-3">
                {room.assignments.map((assignment) => (
                  <article key={assignment.code} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-heading text-lg font-bold text-slate-100">{assignment.title}</h3>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>{assignment.word_count} words</span>
                          <span>{assignment.attempts_allowed} attempt{assignment.attempts_allowed === 1 ? "" : "s"}</span>
                          <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {prettyDue(assignment.due_at)}</span>
                        </div>
                      </div>
                      <span className={assignment.status === "active" ? "rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase text-emerald-300" : "rounded-full bg-slate-700/40 px-2 py-1 text-[10px] font-black uppercase text-slate-400"}>{assignment.status}</span>
                    </div>
                    <Link to={`/assignment/${assignment.code}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400">
                      Open assignment <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-800 p-9 text-center text-sm text-slate-500">No class assignments yet.</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
