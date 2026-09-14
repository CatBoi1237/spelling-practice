import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BookOpenCheck,
  Clock3,
  Flame,
  Gauge,
  Medal,
  Target,
  Trophy,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { achievementProgress } from "@/lib/achievements";
import { computeSkill, levelTitle } from "@/lib/skill";
import { countMastered, getHistory, getMissed } from "@/lib/storage";
import { DIFFICULTY_META } from "@/data/words";

export default function Profile() {
  const { stats } = useApp();
  const { user, playerName } = useAuth();
  const history = useMemo(() => getHistory(), []);
  const missed = useMemo(() => getMissed(), []);
  const mastered = useMemo(() => countMastered(), []);
  const achievements = useMemo(() => achievementProgress(stats), [stats]);
  const level = useMemo(() => computeSkill(history, stats), [history, stats]);

  const accuracy = stats.totalAttempted
    ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100)
    : 0;
  const avgTime = stats.totalAttempted && stats.totalTimeMs
    ? (stats.totalTimeMs / stats.totalAttempted / 1000).toFixed(1)
    : null;
  const unlocked = achievements.filter((achievement) => achievement.unlockedAt);
  const recent = history.slice(0, 5);
  const displayName = user?.name || playerName || "Speller";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="space-y-8">
      <header className="overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-indigo-950/30 p-7 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-amber-500 font-heading text-4xl font-black text-slate-950 shadow-2xl shadow-amber-500/20">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Player profile</div>
            <h1 className="mt-2 truncate font-heading text-4xl font-black text-slate-50 sm:text-5xl">{displayName}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {user ? `Signed in as ${user.email}` : "Guest profile · sign in to protect your progress across devices"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                {level == null ? "Unrated" : `${levelTitle(level)} · ${level.toFixed(1)}/10`}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs font-bold text-slate-300">
                {stats.sessions || 0} sessions
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs font-bold text-slate-300">
                {unlocked.length} achievements
              </span>
            </div>
          </div>
          {!user && (
            <Link to="/signin" className="rounded-xl bg-amber-500 px-5 py-3 text-center text-sm font-bold text-slate-950 hover:bg-amber-400">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <ProfileStat icon={Target} label="Accuracy" value={stats.totalAttempted ? `${accuracy}%` : "—"} />
        <ProfileStat icon={BookOpenCheck} label="Mastered" value={mastered} />
        <ProfileStat icon={Flame} label="Best streak" value={stats.bestStreak || 0} />
        <ProfileStat icon={Trophy} label="Total points" value={(stats.totalPoints || 0).toLocaleString()} />
        <ProfileStat icon={Award} label="Words attempted" value={(stats.totalAttempted || 0).toLocaleString()} />
        <ProfileStat icon={Clock3} label="Avg response" value={avgTime ? `${avgTime}s` : "—"} />
        <ProfileStat icon={Medal} label="Perfect sessions" value={stats.perfectSessions || 0} />
        <ProfileStat icon={Gauge} label="Skill level" value={level == null ? "—" : level.toFixed(1)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-300">Recent form</div>
              <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Latest sessions</h2>
            </div>
            <Link to="/progress" className="text-sm font-bold text-amber-400 hover:text-amber-300">Full progress →</Link>
          </div>

          <div className="mt-5 space-y-3">
            {recent.length ? recent.map((session, index) => {
              const total = (session.correct || 0) + (session.incorrect || 0);
              const sessionAccuracy = total ? Math.round(((session.correct || 0) / total) * 100) : 0;
              return (
                <div key={`${session.date || index}-${index}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold capitalize text-slate-100">{session.mode || "practice"}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {DIFFICULTY_META[session.difficulty]?.label || session.difficulty || "Mixed"} · {session.correct || 0}/{total || 0} correct
                    </div>
                  </div>
                  <span className={sessionAccuracy >= 80 ? "font-mono font-black text-emerald-300" : sessionAccuracy >= 60 ? "font-mono font-black text-amber-300" : "font-mono font-black text-rose-300"}>
                    {sessionAccuracy}%
                  </span>
                </div>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-slate-800 p-7 text-center text-sm text-slate-500">Play a practice session to start building your profile.</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Training focus</div>
              <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Words to master</h2>
            </div>
            {missed.length > 0 && <Link to="/practice?mode=mistakes" className="text-sm font-bold text-amber-400 hover:text-amber-300">Practise →</Link>}
          </div>

          <div className="mt-5 space-y-3">
            {missed.length ? missed.slice(0, 6).map((word) => (
              <div key={word.word} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                <div>
                  <div className="font-mono text-base tracking-wider text-slate-100">{word.word}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{word.correct}/{word.attempts} correct · streak {word.streak}</div>
                </div>
                <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-200">{word.accuracy}%</span>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-800 p-7 text-center text-sm text-slate-500">No outstanding mistakes. Keep practising to discover your next challenge.</div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Achievements</div>
            <h2 className="mt-1 font-heading text-2xl font-bold text-slate-50">Trophy cabinet</h2>
          </div>
          <Link to="/achievements" className="text-sm font-bold text-amber-400 hover:text-amber-300">View all →</Link>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-10">
          {achievements.slice(0, 10).map((achievement) => (
            <div
              key={achievement.id}
              title={`${achievement.title} — ${achievement.desc}`}
              className={achievement.unlockedAt
                ? "grid aspect-square place-items-center rounded-2xl border border-amber-500/35 bg-amber-500/10 text-3xl"
                : "grid aspect-square place-items-center rounded-2xl border border-slate-800 bg-slate-950/50 text-3xl grayscale opacity-35"}
            >
              {achievement.emoji}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-amber-400" />
      </div>
      <div className="mt-3 font-heading text-3xl font-black text-slate-50">{value}</div>
    </div>
  );
}
