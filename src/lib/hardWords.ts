import type { WordProgress } from "@/lib/types";

/** 0..1 — how often the word is missed (needs ≥2 exposures to count). */
export function hardness(p: WordProgress): number {
  if (p.timesSeen < 2) return 0;
  return 1 - p.timesCorrect / p.timesSeen;
}

/** The learner's hardest words, worst first. */
export function hardWordIds(
  progress: Record<number, WordProgress>,
  minHardness = 0.34,
  cap = 12,
): number[] {
  return Object.values(progress)
    .filter((p) => p.timesSeen >= 2 && hardness(p) >= minHardness)
    .sort(
      (a, b) =>
        hardness(b) - hardness(a) || (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""),
    )
    .slice(0, cap)
    .map((p) => p.wordId);
}
