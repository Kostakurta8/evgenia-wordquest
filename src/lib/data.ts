"use client";

import type { Journey, Lesson, Region, Word } from "@/lib/types";

/**
 * Client-side dataset loaders. words.json (~1.1 MB) and journey.json are
 * static public assets — fetched once per session and cached at module level.
 *
 * Failure handling matters here: a rejected promise must NOT stay cached,
 * otherwise one flaky fetch blanks the app until a full reload. Each loader
 * retries (with backoff) and clears its cache slot on final failure so the
 * next call starts fresh.
 */

async function fetchJsonWithRetry<T>(url: string, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, { cache: "force-cache" });
      if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
      return (await r.json()) as T;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((res) => setTimeout(res, 400 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

let wordsPromise: Promise<Word[]> | null = null;
let journeyPromise: Promise<Journey> | null = null;
let wordMap: Map<number, Word> | null = null;

export function loadWords(): Promise<Word[]> {
  if (!wordsPromise) {
    wordsPromise = fetchJsonWithRetry<Word[]>("/words.json").catch((err) => {
      wordsPromise = null; // never cache a rejection
      throw err;
    });
  }
  return wordsPromise;
}

export async function loadWordMap(): Promise<Map<number, Word>> {
  if (!wordMap) {
    const words = await loadWords();
    wordMap = new Map(words.map((w) => [w.id, w]));
  }
  return wordMap;
}

export function loadJourney(): Promise<Journey> {
  if (!journeyPromise) {
    journeyPromise = fetchJsonWithRetry<Journey>("/journey.json").catch((err) => {
      journeyPromise = null; // never cache a rejection
      throw err;
    });
  }
  return journeyPromise;
}

// --- Journey helpers (pure) -------------------------------------------------

export interface LessonRef {
  region: Region;
  lesson: Lesson;
  /** position in the global, book-ordered lesson sequence */
  globalIndex: number;
}

export function flattenLessons(journey: Journey): LessonRef[] {
  const out: LessonRef[] = [];
  for (const region of journey.regions) {
    for (const lesson of region.lessons) {
      out.push({ region, lesson, globalIndex: out.length });
    }
  }
  return out;
}

export function findLesson(journey: Journey, lessonId: string): LessonRef | null {
  return flattenLessons(journey).find((l) => l.lesson.id === lessonId) ?? null;
}

/**
 * A lesson is unlocked when every earlier lesson in the global sequence is
 * completed. The first lesson is always unlocked.
 */
export function isUnlocked(
  refs: LessonRef[],
  globalIndex: number,
  completed: Record<string, string>,
): boolean {
  if (globalIndex === 0) return true;
  const prev = refs[globalIndex - 1];
  return Boolean(prev && completed[prev.lesson.id]);
}

/** The first not-yet-completed lesson (the pulsing "current" node). */
export function currentLessonIndex(refs: LessonRef[], completed: Record<string, string>): number {
  for (const ref of refs) {
    if (!completed[ref.lesson.id]) return ref.globalIndex;
  }
  return refs.length - 1;
}
