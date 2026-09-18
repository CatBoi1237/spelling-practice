export function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function mergePracticeDays(...lists) {
  return [...new Set(lists.flat().filter(day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)))].sort().slice(-400);
}

export function daysFromHistory(history) {
  return history.map(s => new Date(s.date)).filter(date => !Number.isNaN(date.getTime())).map(dayKey);
}

export function mergeArcadeRecords(...sources) {
  const result = {};
  for (const source of sources) for (const [key, record] of Object.entries(source || {})) {
    if (!key.startsWith('arcade-') || !record || typeof record !== 'object') continue;
    const current = result[key] || { points: 0, rounds: {} };
    current.points = Math.max(current.points, Number(record.points) || 0);
    for (const [length, round] of Object.entries(record.rounds || {})) {
      if (!Number.isInteger(Number(length)) || Number(length) < 1 || !round) continue;
      const old = current.rounds[length] || { accuracy: 0, perfectSeconds: null };
      const speeds = [old.perfectSeconds, round.perfectSeconds].filter(n => Number.isFinite(n) && n > 0);
      current.rounds[length] = { accuracy: Math.min(100, Math.max(old.accuracy, Number(round.accuracy) || 0)), perfectSeconds: speeds.length ? Math.min(...speeds) : null };
    }
    result[key] = current;
  }
  return result;
}

export function recordsFromHistory(history) {
  let records = {};
  for (const session of history) {
    if (!session.mode?.startsWith('arcade-')) continue;
    const total = (Number(session.correct) || 0) + (Number(session.incorrect) || 0);
    const length = session.roundLength || total;
    const full = total > 0 && total === length;
    const speed = full && session.incorrect === 0 && session.timingVersion === 2 && Number.isFinite(session.avgTime) && session.avgTime > 0 ? session.avgTime : null;
    const record = { points: Number(session.points) || 0, rounds: full ? { [length]: { accuracy: Math.round(session.correct / total * 100), perfectSeconds: speed } } : {} };
    records = mergeArcadeRecords(records, { [`${session.mode}:${session.difficulty}`]: record });
  }
  return records;
}

export function practiceStreak(days, now = new Date()) {
  const active = new Set(days), date = new Date(now);
  date.setHours(12, 0, 0, 0);
  if (!active.has(dayKey(date))) date.setDate(date.getDate() - 1);
  let streak = 0;
  while (active.has(dayKey(date))) { streak++; date.setDate(date.getDate() - 1); }
  return streak;
}
