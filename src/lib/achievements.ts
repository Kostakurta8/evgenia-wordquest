import type { Lang } from "@/lib/types";

export interface AchievementDef {
  key: string;
  emoji: string;
  title: Record<Lang, string>;
  desc: Record<Lang, string>;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "first-lesson",
    emoji: "🌱",
    title: { bg: "Първи стъпки", en: "First steps" },
    desc: { bg: "Завърши първия си урок", en: "Finish your first lesson" },
  },
  {
    key: "perfect-lesson",
    emoji: "💎",
    title: { bg: "Безупречно", en: "Flawless" },
    desc: { bg: "Завърши урок без нито една грешка", en: "Finish a lesson with zero mistakes" },
  },
  {
    key: "streak-3",
    emoji: "🔥",
    title: { bg: "Загрява се", en: "Warming up" },
    desc: { bg: "Учи 3 дни поред", en: "Learn 3 days in a row" },
  },
  {
    key: "streak-7",
    emoji: "🌋",
    title: { bg: "Огнена седмица", en: "Week of fire" },
    desc: { bg: "Учи 7 дни поред", en: "Learn 7 days in a row" },
  },
  {
    key: "words-50",
    emoji: "📚",
    title: { bg: "Колекционерка", en: "Collector" },
    desc: { bg: "Научи 50 думи", en: "Learn 50 words" },
  },
  {
    key: "words-200",
    emoji: "🏰",
    title: { bg: "Кула от думи", en: "Tower of words" },
    desc: { bg: "Научи 200 думи", en: "Learn 200 words" },
  },
  {
    key: "level-5",
    emoji: "⭐",
    title: { bg: "Изгряваща звезда", en: "Rising star" },
    desc: { bg: "Достигни ниво 5", en: "Reach level 5" },
  },
  {
    key: "region-1",
    emoji: "🗺️",
    title: { bg: "Първа глава", en: "First chapter" },
    desc: { bg: "Завърши цяла глава от пътя", en: "Complete a whole chapter of the path" },
  },
  {
    key: "review-1",
    emoji: "🔁",
    title: { bg: "Паметта побеждава", en: "Memory wins" },
    desc: { bg: "Завърши първия си преговор", en: "Finish your first review session" },
  },
  {
    key: "challenge-1",
    emoji: "⚔️",
    title: { bg: "Героиня", en: "Hero" },
    desc: { bg: "Спечели предизвикателство", en: "Win a challenge" },
  },
];

export interface AchievementSnapshot {
  lessonsCompleted: number;
  perfectJustNow: boolean;
  streak: number;
  learnedWords: number;
  level: number;
  regionsCompleted: number;
  reviews: number;
  challengesWon: number;
}

/** Returns the keys whose conditions hold (caller filters already-earned). */
export function checkAchievements(s: AchievementSnapshot): string[] {
  const out: string[] = [];
  if (s.lessonsCompleted >= 1) out.push("first-lesson");
  if (s.perfectJustNow) out.push("perfect-lesson");
  if (s.streak >= 3) out.push("streak-3");
  if (s.streak >= 7) out.push("streak-7");
  if (s.learnedWords >= 50) out.push("words-50");
  if (s.learnedWords >= 200) out.push("words-200");
  if (s.level >= 5) out.push("level-5");
  if (s.regionsCompleted >= 1) out.push("region-1");
  if (s.reviews >= 1) out.push("review-1");
  if (s.challengesWon >= 1) out.push("challenge-1");
  return out;
}
