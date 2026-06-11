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
