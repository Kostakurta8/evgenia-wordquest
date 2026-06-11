/** Raw dictionary entry as parsed from the source docx (data/words_raw.json). */
export interface RawWord {
  /** 1..1177, book order */
  id: number;
  /** printed-book page, 1..352 */
  page: number;
  /** English headword; may carry a qualifier, e.g. "till (verb)" */
  word: string;
  definition: string;
  synonyms: string[];
  antonyms: string[];
  /** Bulgarian gloss */
  translation: string;
}

/** Fully enriched word as shipped in data/words.json. */
export interface Word extends RawWord {
  /** 1–2 sentences, teen-friendly Bulgarian explanation */
  explanationBg: string;
  /** simple English paraphrase (~CEFR B1) */
  explanationEn: string;
  /** fresh example sentence (not from the book) */
  exampleEn: string;
  /** Bulgarian memory hook */
  mnemonicBg: string;
  /** British IPA, e.g. /ˌʌnəbˈtruːsɪv/ */
  ipa: string;
  /** real sentence from the book with the word wrapped in **…**, or null */
  bookSentenceEn: string | null;
  /** printed-book page of that sentence, or null */
  bookSentenceRef: number | null;
}

export type Lang = "bg" | "en";

/** One lesson node on the map: ≤ 8 words in book order. */
export interface Lesson {
  id: string; // e.g. "r02-l03"
  index: number; // 0-based within its region
  wordIds: number[];
}

/** One book chapter = one map region. */
export interface Region {
  index: number;
  book: 0 | 1 | 2; // 0 = prologue
  slug: string;
  titleEn: string;
  titleBg: string;
  emoji: string;
  startPage: number;
  endPage: number;
  wordCount: number;
  lessons: Lesson[];
}

export interface Journey {
  regions: Region[];
  totalWords: number;
  totalLessons: number;
}

export type WordStatus = "new" | "learning" | "review" | "mastered";

/** Local per-word SRS/progress state (mirrors the `progress` table). */
export interface WordProgress {
  wordId: number;
  status: WordStatus;
  /** 0..100 */
  mastery: number;
  ease: number;
  intervalDays: number;
  /** ISO timestamp or null */
  dueAt: string | null;
  reps: number;
  timesSeen: number;
  timesCorrect: number;
  /** ISO timestamp or null */
  lastSeen: string | null;
}

/** Local gamification stats (mirrors the `stats` table). */
export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  /** local calendar date "YYYY-MM-DD" or null */
  lastActive: string | null;
  gems: number;
  /** daily XP goal */
  dailyGoal: number;
  /** XP earned today (client-derived) */
  todayXp: number;
  /** local date the todayXp counter belongs to */
  todayDate: string | null;
}

export type MascotState = "idle" | "happy" | "celebrate" | "encourage";
