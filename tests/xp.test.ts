import { describe, expect, it } from "vitest";
import { levelForXp, levelProgress, localDate, nextStreak, xpForLevel } from "@/lib/xp";

describe("levels", () => {
  it("level 1 starts at 0 XP", () => {
    expect(levelForXp(0)).toBe(1);
    expect(xpForLevel(1)).toBe(0);
  });

  it("thresholds are consistent with levelForXp", () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      expect(levelForXp(xpForLevel(lvl))).toBe(lvl);
      expect(levelForXp(xpForLevel(lvl + 1) - 1)).toBe(lvl);
    }
  });

  it("levelProgress stays in [0, 1)", () => {
    for (const xp of [0, 10, 59, 60, 100, 1000, 12345]) {
      const p = levelProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    }
  });
});

describe("streak", () => {
  it("starts at 1 on first ever activity", () => {
    expect(nextStreak(0, null, "2026-06-11")).toBe(1);
  });

  it("increments when yesterday was active", () => {
    expect(nextStreak(4, "2026-06-10", "2026-06-11")).toBe(5);
  });

  it("survives month boundaries", () => {
    expect(nextStreak(2, "2026-05-31", "2026-06-01")).toBe(3);
  });

  it("same-day activity never double-counts", () => {
    expect(nextStreak(4, "2026-06-11", "2026-06-11")).toBe(4);
  });

  it("a gap resets to 1", () => {
    expect(nextStreak(9, "2026-06-08", "2026-06-11")).toBe(1);
  });

  it("localDate formats as YYYY-MM-DD", () => {
    expect(localDate(new Date(2026, 5, 11, 23, 59))).toBe("2026-06-11");
    expect(localDate(new Date(2026, 0, 2, 0, 1))).toBe("2026-01-02");
  });
});
