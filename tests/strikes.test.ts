import { describe, expect, it } from "vitest";
import { hardWordIds, isHard, needsReview, reviewWordIds, safeMisses } from "@/lib/strikes";
import { freshProgress, grade } from "@/lib/srs";
import type { WordProgress } from "@/lib/types";

const NOW = new Date("2026-06-13T12:00:00Z");

function wp(id: number, over: Partial<WordProgress>): WordProgress {
  return { ...freshProgress(id), ...over };
}

describe("strike membership", () => {
  it("a clean word is in neither deck", () => {
    const p = wp(1, {});
    expect(needsReview(p)).toBe(false);
    expect(isHard(p)).toBe(false);
  });

  it("first miss → за преговор only", () => {
    const p = wp(1, { misses: 1, status: "learning" });
    expect(needsReview(p)).toBe(true);
    expect(isHard(p)).toBe(false);
  });

  it("second miss → трудни (and is still a review word)", () => {
    const p = wp(1, { misses: 2, status: "review" });
    expect(needsReview(p)).toBe(true);
    expect(isHard(p)).toBe(true);
  });

  it("mastered words leave both decks regardless of strikes", () => {
    const p = wp(1, { misses: 5, status: "mastered" });
    expect(needsReview(p)).toBe(false);
    expect(isHard(p)).toBe(false);
  });
});

describe("strike selection (worst-first, mastered excluded)", () => {
  const progress: Record<number, WordProgress> = {
    1: wp(1, { misses: 1, status: "learning", lastSeen: "2026-06-10" }),
    2: wp(2, { misses: 3, status: "review", lastSeen: "2026-06-11" }),
    3: wp(3, { misses: 2, status: "review", lastSeen: "2026-06-12" }),
    4: wp(4, { misses: 0, status: "learning" }),
    5: wp(5, { misses: 4, status: "mastered" }),
  };

  it("reviewWordIds = strike ≥ 1 & not mastered, worst-first", () => {
    expect(reviewWordIds(progress)).toEqual([2, 3, 1]);
  });

  it("hardWordIds = strike ≥ 2 & not mastered, worst-first", () => {
    expect(hardWordIds(progress)).toEqual([2, 3]);
  });

  it("respects the cap", () => {
    expect(reviewWordIds(progress, 2)).toEqual([2, 3]);
  });
});

describe("safeMisses guards legacy progress (no `misses` field)", () => {
  it("coerces undefined / NaN / null to 0 so a strike bump never yields NaN", () => {
    expect(safeMisses(undefined)).toBe(0);
    expect(safeMisses(null)).toBe(0);
    expect(safeMisses(NaN)).toBe(0);
    expect(safeMisses("2" as unknown)).toBe(0);
    expect(safeMisses(3)).toBe(3);
    // the actual bump path that used to break: undefined + 1
    expect(Math.min(safeMisses(undefined) + 1, 9)).toBe(1);
  });

  it("a legacy word (misses undefined) is correctly out of both decks", () => {
    const legacy = { ...freshProgress(9), status: "learning" } as WordProgress;
    // simulate pre-feature persisted shape
    delete (legacy as { misses?: number }).misses;
    expect(needsReview(legacy)).toBe(false);
    expect(isHard(legacy)).toBe(false);
  });
});

describe("graduation clears strikes once mastered", () => {
  it("grade() zeroes misses when the word reaches mastered", () => {
    // Drive a word to mastery with clean reps, carrying a strike along.
    let p: WordProgress = { ...freshProgress(1), misses: 2 };
    for (let i = 0; i < 6; i++) p = grade(p, 5, NOW);
    expect(p.status).toBe("mastered");
    expect(p.misses).toBe(0);
    expect(isHard(p)).toBe(false);
  });
});
