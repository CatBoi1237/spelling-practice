import { useCallback, useEffect, useState } from "react";
import { Lock, Pause, Users } from "lucide-react";
import { useParams } from "react-router-dom";

import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getPlayerId } from "@/lib/identity";

export default function ClassroomManagedStatus() {
  const { code } = useParams();
  const roomCode = (code || "").toUpperCase();
  const { user } = useAuth();
  const playerId = user?.id || getPlayerId();
  const [room, setRoom] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get(`/classrooms/${roomCode}`, { params: { player_id: playerId } });
      setRoom(data);
    } catch {
      // Classroom itself owns the not-found UI.
    }
  }, [roomCode, playerId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 900);
    const onChanged = () => refresh();
    window.addEventListener("spellbee:classroom-management-changed", onChanged);
    return () => {
      clearInterval(timer);
      window.removeEventListener("spellbee:classroom-management-changed", onChanged);
    };
  }, [refresh]);

  if (!room || room.role === "host") return null;

  if (room.status === "paused") {
    return (
      <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/90 p-5 backdrop-blur-md lg:left-64">
        <div className="w-full max-w-xl rounded-3xl border border-indigo-500/30 bg-slate-900 p-8 text-center shadow-2xl">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-indigo-500/10 text-indigo-300"><Pause className="h-8 w-8" /></span>
          <div className="mt-5 text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300">Classroom paused</div>
          <h2 className="mt-2 font-heading text-3xl font-black text-slate-50">Keep your answer — the timer is stopped.</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">Your teacher paused this round. SpellBee will return to the answer screen automatically when the round resumes.</p>
          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-4 py-2 font-mono text-sm font-black tracking-widest text-amber-300">{roomCode}</div>
        </div>
      </div>
    );
  }

  if (room.status === "locked") {
    const alreadyJoined = room.role === "student";
    return (
      <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/90 p-5 backdrop-blur-md lg:left-64">
        <div className="w-full max-w-xl rounded-3xl border border-amber-500/30 bg-slate-900 p-8 text-center shadow-2xl">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-amber-300"><Lock className="h-8 w-8" /></span>
          <div className="mt-5 text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">Room locked</div>
          <h2 className="mt-2 font-heading text-3xl font-black text-slate-50">{alreadyJoined ? "You're still in the class." : "Joining is temporarily closed."}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{alreadyJoined ? "Your teacher locked the waiting room. Stay here — the game will continue automatically when it starts." : "The teacher locked this room so no new students can join. Ask your teacher to reopen joining."}</p>
          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-black text-slate-300"><Users className="h-4 w-4" /> {room.students.length} students · <span className="font-mono tracking-widest text-amber-300">{roomCode}</span></div>
        </div>
      </div>
    );
  }

  return null;
}
