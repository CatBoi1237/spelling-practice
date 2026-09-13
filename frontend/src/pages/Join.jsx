import { useState } from "react";
import { ArrowRight, GraduationCap, Loader2, ScanLine, Swords } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { useAuth } from "@/context/AuthContext";

export default function Join() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const playerId = user?.id || getPlayerId();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [ambiguous, setAmbiguous] = useState(null);

  const cleanCode = code.trim().toUpperCase();

  const findGame = async (event) => {
    event.preventDefault();
    setAmbiguous(null);

    if (cleanCode.length !== 6) {
      toast.error("Game codes are 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const [race, classroom] = await Promise.allSettled([
        api.get(`/rooms/${cleanCode}`),
        api.get(`/classrooms/${cleanCode}`, { params: { player_id: playerId } }),
      ]);

      const raceExists = race.status === "fulfilled";
      const classroomExists = classroom.status === "fulfilled";

      if (raceExists && classroomExists) {
        setAmbiguous({ race: true, classroom: true });
        return;
      }

      if (classroomExists) {
        navigate(`/classroom/${cleanCode}`);
        return;
      }

      if (raceExists) {
        navigate(`/room/${cleanCode}`);
        return;
      }

      toast.error("No Race or Classroom game was found with that code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] border border-indigo-500/25 bg-gradient-to-br from-indigo-500/15 via-slate-900 to-amber-950/20 p-7 sm:p-10">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">
            <ScanLine className="h-3.5 w-3.5" /> Smart Join
          </span>
          <h1 className="mt-4 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">
            One code. Any game.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Enter the six-character code your friend or teacher gave you. SpellBee will work out whether it’s a Race or Classroom game automatically.
          </p>
        </div>
      </header>

      <form onSubmit={findGame} className="rounded-3xl border border-slate-800 bg-slate-900/45 p-6 sm:p-8">
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Game code</span>
          <input
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            maxLength={6}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            placeholder="BEE742"
            aria-label="Six-character game code"
            className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-5 text-center font-mono text-3xl font-black uppercase tracking-[0.4em] text-slate-50 outline-none ring-indigo-500/40 focus:border-indigo-500/60 focus:ring-2 sm:text-4xl"
          />
        </label>

        <button
          type="submit"
          disabled={busy || cleanCode.length !== 6}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 font-bold text-slate-950 shadow-lg shadow-amber-500/15 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {busy ? "Checking code…" : "Join game"}
        </button>

        {ambiguous && (
          <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
            <div className="text-sm font-bold text-amber-200">That code exists in both game types.</div>
            <p className="mt-1 text-xs text-slate-400">Choose the one you were invited to.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => navigate(`/room/${cleanCode}`)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm font-bold text-indigo-200 hover:bg-indigo-500/20">
                <Swords className="h-4 w-4" /> Join Race
              </button>
              <button type="button" onClick={() => navigate(`/classroom/${cleanCode}`)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200 hover:bg-amber-500/20">
                <GraduationCap className="h-4 w-4" /> Join Classroom
              </button>
            </div>
          </div>
        )}
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard icon={Swords} title="Race Mode" text="Everyone hears and spells their own words while the live progress board updates." />
        <InfoCard icon={GraduationCap} title="Classroom Mode" text="Your teacher controls the word and audio while you type your answer on your device." />
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-5">
      <Icon className="h-5 w-5 text-amber-400" />
      <div className="mt-3 font-heading text-lg font-bold text-slate-100">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p>
    </div>
  );
}
