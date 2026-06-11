import type { WordProgress, WordStatus } from "@/lib/types";

/**
 * SM-2-style scheduler. Quality scale (0..5):
 *   5 — correct on first try, no hesitation (intro + all exercises clean)
 *   4 — correct on first try
 *   3 — correct after an in-lesson retry
 *   1 — wrong (re-queued in lesson)
 * q ≥ 3 advances the schedule; q < 3 resets reps and brings the word back soon.
 */

export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;

export function freshProgress(wordId: number): WordProgress {
  return {
    wordId,
    status: "new",
    mastery: 0,
    ease: DEFAULT_EASE,
    intervalDays: 0,
    dueAt: null,
    reps: 0,
    timesSeen: 0,
    timesCorrect: 0,
    lastSeen: null,
  };
}

function statusFor(p: WordProgress): WordStatus {
  if (p.reps >= 4 && p.ease >= 2.2 && p.intervalDays >= 14) return "mastered";
  if (p.reps >= 1) return "review";
  if (p.timesSeen > 0) return "learning";
  return "new";
}

function masteryFor(p: WordProgress): number {
  const repsPart = Math.min(p.reps, 4) * 15; // 0..60
  const ratePart = p.timesSeen > 0 ? (p.timesCorrect / p.timesSeen) * 40 : 0; // 0..40
  return Math.round(Math.min(100, repsPart + ratePart));
}

/** Apply one graded encounter. `now` is injectable for tests. */
export function grade(prev: WordProgress, quality: number, now: Date = new Date()): WordProgress {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  const p: WordProgress = { ...prev };
  p.timesSeen += 1;
  if (q >= 3) p.timesCorrect += 1;
  p.lastSeen = now.toISOString();

  if (q >= 3) {
    p.reps += 1;
    if (p.reps === 1) p.intervalDays = 1;
    else if (p.reps === 2) p.intervalDays = 3;
    else p.intervalDays = Math.round(p.intervalDays * p.ease);
    p.ease = Math.max(MIN_EASE, p.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    p.dueAt = new Date(now.getTime() + p.intervalDays * 86_400_000).toISOString();
  } else {
    p.reps = 0;
    p.intervalDays = 0;
    p.ease = Math.max(MIN_EASE, p.ease - 0.2);
    // misses come back within the next session, not in days
    p.dueAt = new Date(now.getTime() + 10 * 60_000).toISOString();
  }

  p.mastery = masteryFor(p);
  p.status = statusFor(p);
  return p;
}

/** Mark a word as introduced (Word Card seen) without grading it. */
export function markIntroduced(prev: WordProgress, now: Date = new Date()): WordProgress {
  const p: WordProgress = { ...prev };
  if (p.timesSeen === 0) {
    p.lastSeen = now.toISOString();
    p.status = "learning";
  }
  return p;
}

export function isDue(p: WordProgress, now: Date = new Date()): boolean {
  return p.dueAt !== null && new Date(p.dueAt).getTime() <= now.getTime();
}

export function dueCount(all: Iterable<WordProgress>, now: Date = new Date()): number {
  let n = 0;
  for (const p of all) if (isDue(p, now)) n++;
  return n;
}
