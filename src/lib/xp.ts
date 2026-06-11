/** XP, levels, gems, streak rules — all pure and unit-testable. */

export const XP = {
  firstTryCorrect: 2,
  retryCorrect: 1,
  lessonComplete: 20,
  perfectBonus: 15,
} as const;

export const GEMS = {
  lessonComplete: 5,
  perfectBonus: 10,
} as const;

export const DEFAULT_DAILY_GOAL = 30;

/** Cumulative XP needed to *reach* level n (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  return 60 * (level - 1) * (level - 1);
}

export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 60)) + 1;
}

/** Progress (0..1) within the current level. */
export function levelProgress(xp: number): number {
  const lvl = levelForXp(xp);
  const lo = xpForLevel(lvl);
  const hi = xpForLevel(lvl + 1);
  return hi === lo ? 0 : (xp - lo) / (hi - lo);
}

/** Local calendar date "YYYY-MM-DD" (the learner's timezone). */
export function localDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function prevDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return localDate(dt);
}

/**
 * Streak update on the first activity of a day:
 * yesterday active → +1; today already counted → unchanged; gap → reset to 1.
 */
export function nextStreak(
  streak: number,
  lastActive: string | null,
  today: string,
): number {
  if (lastActive === today) return Math.max(1, streak);
  if (lastActive === prevDate(today)) return streak + 1;
  return 1;
}
