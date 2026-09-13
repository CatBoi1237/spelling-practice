// Achievement definitions + evaluation against stats / session data.
import { getUnlocked, saveUnlocked, countMastered, getDailyLocal } from "@/lib/storage";

export const ACHIEVEMENTS = [
  { id: "first", emoji: "🐣", title: "First Spell", desc: "Complete your first word.", target: 1, value: (s) => s.stats.totalAttempted },
  { id: "onfire", emoji: "🔥", title: "On Fire", desc: "Get 10 correct in a row.", target: 10, value: (s) => s.stats.bestStreak },
  { id: "inferno", emoji: "🌋", title: "Inferno", desc: "Get 25 correct in a row.", target: 25, value: (s) => s.stats.bestStreak },
  { id: "champion", emoji: "🏆", title: "Bee Champion", desc: "Complete 100 words.", target: 100, value: (s) => s.stats.totalAttempted },
  { id: "legend", emoji: "🐝", title: "Hive Legend", desc: "Complete 1,000 words.", target: 1000, value: (s) => s.stats.totalAttempted },
  { id: "master50", emoji: "📚", title: "Word Collector", desc: "Master 50 words.", target: 50, value: (s) => s.mastered },
  { id: "master250", emoji: "🧠", title: "Vocabulary Master", desc: "Master 250 words.", target: 250, value: (s) => s.mastered },
  { id: "speed", emoji: "⚡", title: "Speed Demon", desc: "Answer correctly in under 3 seconds.", target: 1, value: (s) => (s.stats.fastestAnswerMs != null && s.stats.fastestAnswerMs < 3000 ? 1 : 0) },
  { id: "perfect", emoji: "💯", title: "Perfect Score", desc: "Score 20/20 in a session.", target: 1, value: (s) => s.stats.perfectSessions },
  { id: "extreme", emoji: "👑", title: "Extreme", desc: "Complete an Extreme session.", target: 1, value: (s) => s.stats.extremeSessions },
  { id: "points", emoji: "💎", title: "High Roller", desc: "Earn 10,000 points.", target: 10000, value: (s) => s.stats.totalPoints },
  { id: "daily3", emoji: "📅", title: "Warming Up", desc: "3-day Daily Challenge streak.", target: 3, value: (s) => s.daily.bestStreak },
  { id: "daily7", emoji: "🗓️", title: "Week Warrior", desc: "7-day Daily Challenge streak.", target: 7, value: (s) => s.daily.bestStreak },
  { id: "daily14", emoji: "🌙", title: "Fortnight Focus", desc: "14-day Daily Challenge streak.", target: 14, value: (s) => s.daily.bestStreak },
  { id: "daily30", emoji: "🎯", title: "Dedicated", desc: "30-day Daily Challenge streak.", target: 30, value: (s) => s.daily.bestStreak },
  { id: "daily50", emoji: "🌟", title: "Half Century", desc: "50-day Daily Challenge streak.", target: 50, value: (s) => s.daily.bestStreak },
  { id: "daily100", emoji: "💫", title: "Centurion", desc: "100-day Daily Challenge streak.", target: 100, value: (s) => s.daily.bestStreak },
  { id: "daily365", emoji: "🪐", title: "Year of the Bee", desc: "365-day Daily Challenge streak.", target: 365, value: (s) => s.daily.bestStreak },
];

export function evaluateAchievements(stats) {
  const snapshot = { stats, mastered: countMastered(), daily: getDailyLocal() };
  const unlocked = getUnlocked();
  const newly = [];
  ACHIEVEMENTS.forEach((a) => {
    if (unlocked[a.id]) return;
    if (a.value(snapshot) >= a.target) {
      unlocked[a.id] = new Date().toISOString();
      newly.push(a);
    }
  });
  if (newly.length) saveUnlocked(unlocked);
  return { newly, unlocked, snapshot };
}

export function achievementProgress(stats) {
  const snapshot = { stats, mastered: countMastered(), daily: getDailyLocal() };
  const unlocked = getUnlocked();
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    unlockedAt: unlocked[a.id] || null,
    current: Math.min(a.target, a.value(snapshot)),
  }));
}
