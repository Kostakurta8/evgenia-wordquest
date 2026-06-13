import type { WordProgress } from "@/lib/types";

/**
 * Strike-based routing for the Преговор (review) and Трудни (hard) tabs.
 *
 * Evgenia's rule:
 *   • miss a word in one sitting   → it appears in "за преговор" (needsReview)
 *   • miss it again in a later one → it auto-moves to "трудни"   (isHard)
 *   • it leaves both only once the word is fully mastered (SM-2).
 *
 * The per-sitting strike count lives in `WordProgress.misses` (bumped at most
 * once per session by the store's recordMisses). Membership always excludes
 * mastered words so the decks self-empty as she improves.
 */

/** `misses` is a new field; progress saved before this feature has it
 *  undefined. Coerce any non-finite value to 0 so a strike bump (undefined + 1)
 *  can never produce NaN and silently disable routing for existing users. */
export function safeMisses(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/** Missed at least once and not yet mastered → "за преговор". */
export function needsReview(p: WordProgress): boolean {
  return p.misses >= 1 && p.status !== "mastered";
}

/** Missed in ≥ 2 separate sittings and not yet mastered → "трудни". */
export function isHard(p: WordProgress): boolean {
  return p.misses >= 2 && p.status !== "mastered";
}

/** Worst (most strikes), most recently seen first. */
function worstFirst(a: WordProgress, b: WordProgress): number {
  return b.misses - a.misses || (b.lastSeen ?? "").localeCompare(a.lastSeen ?? "");
}

/** Ids of words due for review because she got them wrong (за преговор). */
export function reviewWordIds(progress: Record<number, WordProgress>, cap = 60): number[] {
  return Object.values(progress)
    .filter(needsReview)
    .sort(worstFirst)
    .slice(0, cap)
    .map((p) => p.wordId);
}

/** Ids of the words that tripped her up twice — the hard-words deck (трудни). */
export function hardWordIds(progress: Record<number, WordProgress>, cap = 60): number[] {
  return Object.values(progress)
    .filter(isHard)
    .sort(worstFirst)
    .slice(0, cap)
    .map((p) => p.wordId);
}
