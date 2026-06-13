"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Lang, UserStats, WordProgress } from "@/lib/types";
import { freshProgress, grade, markIntroduced } from "@/lib/srs";
import { DEFAULT_DAILY_GOAL, GEMS, XP, levelForXp, localDate, nextStreak } from "@/lib/xp";
import { safeMisses } from "@/lib/strikes";
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
  /** region slug → ISO openedAt for claimed region-completion chests */
  chestsOpened: Record<string, string>;
  /** achievement key → ISO earnedAt */
  earned: Record<string, string>;
  /** achievement keys earned but not yet shown as a toast */
  pendingAchievements: string[];
  /** local-only counters feeding achievements */
  counters: { reviews: number; challenges: number };
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
  /** Bump the per-sitting strike counter once for each word missed this session. */
  recordMisses: (wordIds: number[]) => void;
  completeLesson: (lessonId: string, opts: { taskXp: number; perfect: boolean }) => void;
  /** XP outside lessons (review/challenge), optionally with gems. */
  addBonusXp: (xp: number, gems?: number) => void;
  openChest: (regionSlug: string, gems: number) => void;
  awardAchievements: (keys: string[]) => void;
  popPendingAchievement: () => string | null;
  bumpCounter: (key: "reviews" | "challenges") => void;
  setDailyGoal: (xp: number) => void;
  mergeCloud: (
    rows: WordProgress[],
    cloudStats: Partial<UserStats> | null,
    cloudLessons: Record<string, string>,
    cloudEarned?: Record<string, string>,
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
    (set, get) => ({
      lang: "bg",
      sound: true,
      progress: {},
      completedLessons: {},
      stats: initialStats,
      chestsOpened: {},
      earned: {},
      pendingAchievements: [],
      counters: { reviews: 0, challenges: 0 },
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

      recordMisses: (wordIds) =>
        set((s) => {
          const ids = [...new Set(wordIds)].filter((id) => id >= 0);
          if (ids.length === 0) return s;
          const progress = { ...s.progress };
          let dirtyWords = s.dirtyWords;
          for (const id of ids) {
            const prev = progress[id] ?? freshProgress(id);
            // +1 per sitting, capped so it can't run away; a freshly-missed
            // word is never "mastered", so this immediately routes it to
            // за преговор (1) or трудни (2). See lib/strikes.ts.
            progress[id] = { ...prev, misses: Math.min(safeMisses(prev.misses) + 1, 9) };
            dirtyWords = addDirty(dirtyWords, id);
          }
          return { progress, dirtyWords };
        }),

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

      addBonusXp: (xp, gems = 0) =>
        set((s) => ({
          stats: { ...applyXp(s.stats, xp, new Date()), gems: s.stats.gems + gems },
          statsDirty: true,
        })),

      openChest: (regionSlug, gems) =>
        set((s) =>
          s.chestsOpened[regionSlug]
            ? s
            : {
                chestsOpened: { ...s.chestsOpened, [regionSlug]: new Date().toISOString() },
                stats: { ...s.stats, gems: s.stats.gems + gems },
                statsDirty: true,
              },
        ),

      awardAchievements: (keys) =>
        set((s) => {
          const fresh = keys.filter((k) => !s.earned[k]);
          if (fresh.length === 0) return s;
          const now = new Date().toISOString();
          const earned = { ...s.earned };
          for (const k of fresh) earned[k] = now;
          return { earned, pendingAchievements: [...s.pendingAchievements, ...fresh] };
        }),

      popPendingAchievement: () => {
        const [head, ...rest] = get().pendingAchievements;
        if (!head) return null;
        set({ pendingAchievements: rest });
        return head;
      },

      bumpCounter: (key) =>
        set((s) => ({ counters: { ...s.counters, [key]: s.counters[key] + 1 } })),

      setDailyGoal: (xp) =>
        set((s) => ({ stats: { ...s.stats, dailyGoal: xp }, statsDirty: true })),

      mergeCloud: (rows, cloudStats, cloudLessons, cloudEarned) =>
        set((s) => {
          const progress = { ...s.progress };
          for (const cloud of rows) {
            const local = progress[cloud.wordId];
            const cloudWins =
              !local ||
              cloud.timesSeen > local.timesSeen ||
              (cloud.timesSeen === local.timesSeen &&
                (cloud.lastSeen ?? "") > (local.lastSeen ?? ""));
            if (cloudWins) {
              // `misses` is local-first (cloud may lack the column → 0). Keep the
              // higher strike count so a sync never silently empties Трудни.
              progress[cloud.wordId] = {
                ...cloud,
                misses: Math.max(safeMisses(cloud.misses), safeMisses(local?.misses)),
              };
            }
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
            // cloud achievements merge silently — no toast for old earnings
            earned: { ...cloudEarned, ...s.earned },
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
      // v1 adds WordProgress.misses. Existing devices have progress saved
      // without it → backfill 0 so strike routing works for current users.
      version: 1,
      migrate: (persisted, version) => {
        const s = persisted as { progress?: Record<number, WordProgress> } | undefined;
        if (version < 1 && s?.progress) {
          for (const p of Object.values(s.progress)) {
            if (p) p.misses = safeMisses(p.misses);
          }
        }
        return s as AppState;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        lang: s.lang,
        sound: s.sound,
        progress: s.progress,
        completedLessons: s.completedLessons,
        stats: s.stats,
        chestsOpened: s.chestsOpened,
        earned: s.earned,
        pendingAchievements: s.pendingAchievements,
        counters: s.counters,
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
