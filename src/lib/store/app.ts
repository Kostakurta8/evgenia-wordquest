"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Lang, UserStats, WordProgress } from "@/lib/types";
import { freshProgress, grade, markIntroduced } from "@/lib/srs";
import { DEFAULT_DAILY_GOAL, GEMS, XP, levelForXp, localDate, nextStreak } from "@/lib/xp";
import { t, type StringKey } from "@/lib/i18n";

export interface AppState {
  // settings
  lang: Lang;
  sound: boolean;
  // learning state
  progress: Record<number, WordProgress>;
  /** lessonId → ISO completedAt */
  completedLessons: Record<string, string>;
  stats: UserStats;
  // auth/sync bookkeeping
  userId: string | null;
  userEmail: string | null;
  dirtyWords: number[];
  statsDirty: boolean;
  hydrated: boolean;

  setLang: (lang: Lang) => void;
  setSound: (on: boolean) => void;
  setHydrated: () => void;
  setUser: (id: string | null, email: string | null) => void;
  introduceWord: (wordId: number) => void;
  gradeWord: (wordId: number, quality: number) => void;
  completeLesson: (lessonId: string, opts: { taskXp: number; perfect: boolean }) => void;
  setDailyGoal: (xp: number) => void;
  mergeCloud: (
    rows: WordProgress[],
    cloudStats: Partial<UserStats> | null,
    cloudLessons: Record<string, string>,
  ) => void;
  markSynced: (wordIds: number[]) => void;
}

const initialStats: UserStats = {
  xp: 0,
  level: 1,
  streak: 0,
  longestStreak: 0,
  lastActive: null,
  gems: 0,
  dailyGoal: DEFAULT_DAILY_GOAL,
  todayXp: 0,
  todayDate: null,
};

function addDirty(dirty: number[], id: number): number[] {
  return dirty.includes(id) ? dirty : [...dirty, id];
}

function applyXp(stats: UserStats, amount: number, now: Date): UserStats {
  const today = localDate(now);
  const xp = stats.xp + amount;
  const next: UserStats = {
    ...stats,
    xp,
    level: levelForXp(xp),
    todayXp: (stats.todayDate === today ? stats.todayXp : 0) + amount,
    todayDate: today,
  };
  if (stats.lastActive !== today) {
    next.streak = nextStreak(stats.streak, stats.lastActive, today);
    next.longestStreak = Math.max(next.streak, stats.longestStreak);
    next.lastActive = today;
  }
  return next;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      lang: "bg",
      sound: true,
      progress: {},
      completedLessons: {},
      stats: initialStats,
      userId: null,
      userEmail: null,
      dirtyWords: [],
      statsDirty: false,
      hydrated: false,

      setLang: (lang) => set({ lang }),
      setSound: (sound) => set({ sound }),
      setHydrated: () => set({ hydrated: true }),
      setUser: (userId, userEmail) => set({ userId, userEmail }),

      introduceWord: (wordId) =>
        set((s) => {
          const prev = s.progress[wordId] ?? freshProgress(wordId);
          if (prev.timesSeen > 0 && prev.status !== "new") return s;
          return {
            progress: { ...s.progress, [wordId]: markIntroduced(prev) },
            dirtyWords: addDirty(s.dirtyWords, wordId),
          };
        }),

      gradeWord: (wordId, quality) =>
        set((s) => ({
          progress: {
            ...s.progress,
            [wordId]: grade(s.progress[wordId] ?? freshProgress(wordId), quality),
          },
          dirtyWords: addDirty(s.dirtyWords, wordId),
        })),

      completeLesson: (lessonId, { taskXp, perfect }) =>
        set((s) => {
          const now = new Date();
          // Replays are practice: task XP only, no completion/perfect bonuses
          // or gems — keeps the economy honest.
          const firstTime = !s.completedLessons[lessonId];
          const gained =
            taskXp + (firstTime ? XP.lessonComplete + (perfect ? XP.perfectBonus : 0) : 0);
          const gemsGained = firstTime
            ? GEMS.lessonComplete + (perfect ? GEMS.perfectBonus : 0)
            : 0;
          return {
            completedLessons: {
              ...s.completedLessons,
              [lessonId]: s.completedLessons[lessonId] ?? now.toISOString(),
            },
            stats: {
              ...applyXp(s.stats, gained, now),
              gems: s.stats.gems + gemsGained,
            },
            statsDirty: true,
          };
        }),

      setDailyGoal: (xp) =>
        set((s) => ({ stats: { ...s.stats, dailyGoal: xp }, statsDirty: true })),

      mergeCloud: (rows, cloudStats, cloudLessons) =>
        set((s) => {
          const progress = { ...s.progress };
          for (const cloud of rows) {
            const local = progress[cloud.wordId];
            const cloudWins =
              !local ||
              cloud.timesSeen > local.timesSeen ||
              (cloud.timesSeen === local.timesSeen &&
                (cloud.lastSeen ?? "") > (local.lastSeen ?? ""));
            if (cloudWins) progress[cloud.wordId] = cloud;
          }
          let stats = s.stats;
          if (cloudStats) {
            const cloudLast = cloudStats.lastActive ?? null;
            const cloudIsNewerDay = (cloudLast ?? "") > (stats.lastActive ?? "");
            const xp = Math.max(stats.xp, cloudStats.xp ?? 0);
            stats = {
              ...stats,
              xp,
              level: levelForXp(xp),
              gems: Math.max(stats.gems, cloudStats.gems ?? 0),
              longestStreak: Math.max(stats.longestStreak, cloudStats.longestStreak ?? 0),
              streak: cloudIsNewerDay ? (cloudStats.streak ?? stats.streak) : stats.streak,
              lastActive: cloudIsNewerDay ? cloudLast : stats.lastActive,
              dailyGoal: stats.dailyGoal !== DEFAULT_DAILY_GOAL ? stats.dailyGoal : (cloudStats.dailyGoal ?? stats.dailyGoal),
            };
          }
          return {
            progress,
            stats,
            completedLessons: { ...cloudLessons, ...s.completedLessons },
            // everything local becomes a push candidate after a merge
            dirtyWords: Object.keys(progress).map(Number),
            statsDirty: true,
          };
        }),

      markSynced: (wordIds) =>
        set((s) => ({
          dirtyWords: s.dirtyWords.filter((id) => !wordIds.includes(id)),
          statsDirty: false,
        })),
    }),
    {
      name: "wq-app-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        lang: s.lang,
        sound: s.sound,
        progress: s.progress,
        completedLessons: s.completedLessons,
        stats: s.stats,
        dirtyWords: s.dirtyWords,
        statsDirty: s.statsDirty,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

/** Translation hook bound to the current UI language. */
export function useT(): (key: StringKey) => string {
  const lang = useApp((s) => s.lang);
  return (key) => t(key, lang);
}

/** True once the persisted state has been rehydrated on the client. */
export function useHydrated(): boolean {
  return useApp((s) => s.hydrated);
}
