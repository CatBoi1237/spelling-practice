import { useState } from "react";
import { ArrowRight, ClipboardList, GraduationCap, Loader2, ScanLine, School, Swords } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { useAuth } from "@/context/AuthContext";

const TYPE_META = {
  race: { label: "Race", icon: Swords, path: (code) => `/room/${code}`, tone: "indigo" },
  classroom: { label: "Classroom", icon: GraduationCap, path: (code) => `/classroom/${code}`, tone: "amber" },
  assignment: { label: "Assignment", icon: ClipboardList, path: (code) => `/assignment/${code}`, tone: "emerald" },
  class: { label: "Class", icon: School, path: (code) => `/class/${code}`, tone: "cyan" },
};

export default function Join() {
  const navigate = useNavigate();
  const { user, isTeacher } = useAuth();
  const playerId = user?.id || getPlayerId();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState([]);

  const cleanCode = code.trim().toUpperCase();

  const findGame = async (event) => {
    event.preventDefault();
    setMatches([]);

    if (cleanCode.length !== 6) {
      toast.error("Codes are 6 characters.");
      return;
    }

    setBusy(true);
    try {
      const [race, classroom, assignment, schoolClass] = await Promise.allSettled([
        api.get(`/rooms/${cleanCode}`),
        api.get(`/classrooms/${cleanCode}`, { params: { player_id: playerId } }),
        isTeacher ? Promise.reject(new Error("Student account required")) : api.get(`/assignments/${cleanCode}`, { params: { player_id: playerId } }),
        isTeacher ? Promise.reject(new Error("Student account required")) : api.get(`/classes/${cleanCode}`, { params: { player_id: playerId } }),
      ]);

      const found = [];
      if (race.status === "fulfilled") found.push("race");
      if (classroom.status === "fulfilled") found.push("classroom");
      if (assignment.status === "fulfilled") found.push("assignment");
      if (schoolClass.status === "fulfilled") found.push("class");

      if (found.length === 1) {
        navigate(TYPE_META[found[0]].path(cleanCode));
        return;
      }

      if (found.length > 1) {
        setMatches(found);
        return;
      }

      toast.error("No Race, Classroom, Assignment or Class was found with that code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] border border-indigo-500/25 bg-gradient-to-br from-indigo-500/15 via-slate-900 to-amber-950/20 p-7 sm:p-10">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">
            <ScanLine className="h-3.5 w-3.5" /> Smart Join
          </span>
          <h1 className="mt-4 font-heading text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">
            One code. Anywhere in SpellBee.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Enter the six-character code your friend or teacher gave you. SpellBee can open a Race, live Classroom, Assignment or reusable Class roster.
          </p>
        </div>
      </header>

      <form onSubmit={findGame} className="rounded-3xl border border-slate-800 bg-slate-900/45 p-6 sm:p-8">
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Join code</span>
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
            aria-label="Six-character SpellBee code"
            className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-5 text-center font-mono text-3xl font-black uppercase tracking-[0.4em] text-slate-50 outline-none ring-indigo-500/40 focus:border-indigo-500/60 focus:ring-2 sm:text-4xl"
          />
        </label>

        <button
          type="submit"
          disabled={busy || cleanCode.length !== 6}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 font-bold text-slate-950 shadow-lg shadow-amber-500/15 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {busy ? "Checking code…" : "Open code"}
        </button>

        {matches.length > 1 && (
          <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
            <div className="text-sm font-bold text-amber-200">That code matches more than one SpellBee activity.</div>
            <p className="mt-1 text-xs text-slate-400">Choose the one you were invited to.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {matches.map((type) => {
                const meta = TYPE_META[type];
                const Icon = meta.icon;
                const classes = meta.tone === "emerald"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                  : meta.tone === "amber"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                    : meta.tone === "cyan"
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                      : "border-indigo-500/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20";
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => navigate(meta.path(cleanCode))}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${classes}`}
                  >
                    <Icon className="h-4 w-4" /> {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={Swords} title="Race Mode" text="Everyone hears and spells their own words while the live progress board updates." />
        <InfoCard icon={GraduationCap} title="Classroom Mode" text="Your teacher controls the word and audio while you type your answer on your device." />
        <InfoCard icon={ClipboardList} title="Assignment" text="Complete teacher-set spelling independently, then see your score and words to practise again." />
        <InfoCard icon={School} title="Class" text="Join a teacher roster once and see class assignments whenever they are added." />
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
