import type { Lang } from "@/lib/types";

/**
 * All UI chrome strings live here in {bg, en} pairs — no hard-coded UI text
 * in components. Target words are always English and never localized.
 */
export const STRINGS = {
  appName: {
    bg: "WordQuest: Задругата на думите",
    en: "WordQuest: Fellowship of Words",
  },
  tagline: {
    bg: "Пътешествие през 1177 думи от „Задругата на пръстена“.",
    en: "A journey through 1177 words from The Fellowship of the Ring.",
  },
  navMap: { bg: "Карта", en: "Map" },
  navReview: { bg: "Преговор", en: "Review" },
  navLexicon: { bg: "Речник", en: "Lexicon" },
  navProfile: { bg: "Профил", en: "Profile" },
  gotIt: { bg: "Разбрах!", en: "Got it!" },
  fromBook: { bg: "от книгата · стр.", en: "from the book · p." },
  synonyms: { bg: "Синоними", en: "Synonyms" },
  antonyms: { bg: "Антоними", en: "Antonyms" },
  mnemonic: { bg: "Запомни така", en: "Memory hook" },
  example: { bg: "Пример", en: "Example" },
  wordsLoaded: { bg: "думи заредени", en: "words loaded" },
  withBookSentence: { bg: "с изречение от книгата", en: "with a book sentence" },
} as const satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang = "bg"): string {
  return STRINGS[key][lang];
}
