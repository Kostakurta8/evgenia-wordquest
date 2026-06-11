import { describe, expect, it } from "vitest";
import { dueCount, freshProgress, grade, isDue, markIntroduced, MIN_EASE } from "@/lib/srs";

const NOW = new Date("2026-06-11T12:00:00Z");
const DAY = 86_400_000;

describe("grade (SM-2)", () => {
  it("first correct answer schedules 1 day out", () => {
    const p = grade(freshProgress(1), 5, NOW);
    expect(p.reps).toBe(1);
    expect(p.intervalDays).toBe(1);
    expect(new Date(p.dueAt!).getTime()).toBe(NOW.getTime() + DAY);
    expect(p.status).toBe("review");
  });

  it("second correct answer schedules 3 days out", () => {
    const p = grade(grade(freshProgress(1), 5, NOW), 5, NOW);
    expect(p.reps).toBe(2);
    expect(p.intervalDays).toBe(3);
  });

  it("third correct answer multiplies by ease", () => {
    let p = freshProgress(1);
    p = grade(p, 5, NOW);
    p = grade(p, 5, NOW);
    const ease = p.ease;
    p = grade(p, 5, NOW);
    expect(p.intervalDays).toBe(Math.round(3 * ease));
  });

  it("a miss resets reps and comes back within minutes", () => {
    let p = freshProgress(1);
    p = grade(p, 5, NOW);
    p = grade(p, 1, NOW);
    expect(p.reps).toBe(0);
    expect(p.intervalDays).toBe(0);
    expect(new Date(p.dueAt!).getTime()).toBe(NOW.getTime() + 10 * 60_000);
  });

  it("ease never drops below the floor", () => {
    let p = freshProgress(1);
    for (let i = 0; i < 20; i++) p = grade(p, 1, NOW);
    expect(p.ease).toBeGreaterThanOrEqual(MIN_EASE);
  });

  it("q=3 (correct after retry) grows ease slower than q=5", () => {
    const fast = grade(freshProgress(1), 5, NOW);
    const slow = grade(freshProgress(1), 3, NOW);
    expect(fast.ease).toBeGreaterThan(slow.ease);
  });

  it("tracks seen/correct counters and mastery", () => {
    let p = freshProgress(1);
    p = grade(p, 5, NOW);
    p = grade(p, 1, NOW);
    expect(p.timesSeen).toBe(2);
    expect(p.timesCorrect).toBe(1);
    expect(p.mastery).toBeGreaterThan(0);
    expect(p.mastery).toBeLessThanOrEqual(100);
  });
});

describe("markIntroduced / due helpers", () => {
  it("intro marks learning without consuming a rep", () => {
    const p = markIntroduced(freshProgress(7), NOW);
    expect(p.status).toBe("learning");
    expect(p.reps).toBe(0);
    expect(p.timesSeen).toBe(0);
  });

  it("isDue/dueCount honour the clock", () => {
    const due = grade(freshProgress(1), 5, NOW); // due in 1 day
    expect(isDue(due, NOW)).toBe(false);
    expect(isDue(due, new Date(NOW.getTime() + DAY + 1))).toBe(true);
    expect(dueCount([due, freshProgress(2)], new Date(NOW.getTime() + DAY + 1))).toBe(1);
  });
});
