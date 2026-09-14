import { useState } from "react";
import { GraduationCap, School, Swords, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import Multiplayer from "@/pages/Multiplayer";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { getPlayerId } from "@/lib/identity";
import { pickSeededWords } from "@/lib/seeded";
import { assignCustomListToGame, buildCustomRacePath } from "@/lib/customWordLists";
import { DIFFICULTY_META } from "@/data/words";
import { cn } from "@/lib/utils";

const SCHOOL_LEVELS = ["grade4", "grade5", "grade6", "year7"];
const COUNTS = [5, 10, 15, 25];

function makeSchoolList(seed, count, level) {
  const words = pickSeededWords(seed, count, level).map((item) => item.word);
  return {
    id: null,
    name: `${DIFFICULTY_META[level]?.label || level} School List`,
    words,
  };
}

function SchoolGameLauncher() {
  const navigate = useNavigate();
  const { user, isTeacher, playerName } = useAuth();
  const playerId = user?.id || getPlayerId();
  const [level, setLevel] = useState("grade6");
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(null);

  const createRace = async () => {
    setBusy("race");
    try {
      const { data } = await api.post("/rooms", {
        player_id: playerId,
        name: playerName || user?.name || "Speller",
        word_count: count,
        difficulty: "mixed",
      });
      const list = makeSchoolList(data.seed, count, level);
      assignCustomListToGame("room", data.code, list);
      navigate(buildCustomRacePath(data.code, list));
    } catch (error) {
      toast.error(apiError(error, "Could not create the school-level race."));
    } finally {
      setBusy(null);
    }
  };

  const createClassroom = async () => {
    if (!isTeacher) return;
    if (!user) {
      toast.error("Teachers need to sign in before hosting Classroom Mode.");
      navigate("/signin");
      return;
    }

    setBusy("classroom");
    try {
      const { data } = await api.post("/classrooms", {
        word_count: count,
        difficulty: "mixed",
        time_limit_sec: 20,
      });
      const list = makeSchoolList(data.seed, count, level);
      assignCustomListToGame("classroom", data.code, list);
      navigate(`/classroom/${data.code}`);
    } catch (error) {
      toast.error(apiError(error, "Could not create the school-level classroom."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mx-auto mb-10 max-w-5xl overflow-hidden rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-slate-900 to-indigo-950/30 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            <GraduationCap className="h-3.5 w-3.5" /> School-level games
          </span>
          <h2 className="mt-3 font-heading text-3xl font-black text-slate-50">Grade 4 → Year 7 multiplayer</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Host a Race or Classroom game using the same easier school-level word banks available in Practice.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-xs text-slate-400">
          Classroom uses normal code/QR joining.<br />School-level Race players should use the host invite link.
        </div>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.7fr]">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">School level</div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SCHOOL_LEVELS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setLevel(id)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm font-bold transition",
                  level === id
                    ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                    : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-cyan-500/30 hover:text-slate-200"
                )}
              >
                {DIFFICULTY_META[id]?.label || id}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Words</div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {COUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setCount(amount)}
                className={cn(
                  "rounded-xl border px-2 py-3 text-sm font-bold transition",
                  count === amount
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
                    : "border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200"
                )}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={createRace}
          disabled={Boolean(busy)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 disabled:opacity-50"
        >
          <Swords className="h-4 w-4" />
          {busy === "race" ? "Creating…" : `Host ${DIFFICULTY_META[level]?.label} Race`}
        </button>
        {isTeacher && <button
          type="button"
          onClick={createClassroom}
          disabled={Boolean(busy)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-50"
        >
          {user ? <School className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          {busy === "classroom" ? "Creating…" : `Host ${DIFFICULTY_META[level]?.label} Classroom`}
        </button>}
      </div>
    </section>
  );
}

export default function MultiplayerShell() {
  return (
    <>
      <SchoolGameLauncher />
      <Multiplayer />
    </>
  );
}
