"use client";

import { getSupabase } from "@/lib/supabase/client";
import type { ProgressInsert, ProgressRow, StatsRow } from "@/lib/supabase/database.types";
import type { UserStats, WordProgress, WordStatus } from "@/lib/types";
import { useApp } from "@/lib/store/app";

const CHUNK = 200;

function toRow(userId: string, p: WordProgress): ProgressInsert {
  return {
    user_id: userId,
    word_id: p.wordId,
    status: p.status,
    mastery: p.mastery,
    ease: p.ease,
    interval_days: p.intervalDays,
    due_at: p.dueAt,
    reps: p.reps,
    times_seen: p.timesSeen,
    times_correct: p.timesCorrect,
    last_seen: p.lastSeen,
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row: ProgressRow): WordProgress {
  return {
    wordId: row.word_id,
    status: row.status as WordStatus,
    mastery: row.mastery,
    ease: row.ease,
    intervalDays: row.interval_days,
    dueAt: row.due_at,
    reps: row.reps,
    timesSeen: row.times_seen,
    timesCorrect: row.times_correct,
    // `misses` is a local-first column; the cloud table may not have it yet
    // (see supabase/migrations/0002_add_misses.sql). Read it gracefully so a
    // cloud pull never wipes a freshly-strike-tracked word back to 0.
    misses: (row as { misses?: number }).misses ?? 0,
    lastSeen: row.last_seen,
  };
}

function lessonsFromStats(row: StatsRow | null): Record<string, string> {
  if (!row) return {};
  const out: Record<string, string> = {};
  if (Array.isArray(row.lessons_completed)) {
    for (const entry of row.lessons_completed) {
      if (typeof entry === "string") out[entry] = row.updated_at;
      else if (entry && typeof entry === "object" && "id" in entry && "at" in entry) {
        out[String(entry.id)] = String(entry.at);
      }
    }
  }
  return out;
}

let inflight = false;

/** Pull cloud state and merge it into the local store. */
export async function pullAndMerge(userId: string): Promise<void> {
  const supabase = getSupabase();
  const rows: ProgressRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("progress")
      .select("*")
      .eq("user_id", userId)
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const { data: statsRow, error: statsErr } = await supabase
    .from("stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (statsErr) throw statsErr;
  const { data: achRows, error: achErr } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", userId);
  if (achErr) throw achErr;
  const cloudEarned: Record<string, string> = {};
  for (const row of achRows ?? []) cloudEarned[row.key] = row.earned_at;

  const cloudStats: Partial<UserStats> | null = statsRow
    ? {
        xp: statsRow.xp,
        gems: statsRow.gems,
        streak: statsRow.streak,
        longestStreak: statsRow.longest_streak,
        lastActive: statsRow.last_active,
        dailyGoal: statsRow.daily_goal,
      }
    : null;

  useApp
    .getState()
    .mergeCloud(rows.map(fromRow), cloudStats, lessonsFromStats(statsRow), cloudEarned);
}

/** Push dirty local state to the cloud. Safe to call often. */
export async function pushDirty(): Promise<void> {
  const s = useApp.getState();
  if (!s.userId || inflight) return;
  if (s.dirtyWords.length === 0 && !s.statsDirty) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  inflight = true;
  const userId = s.userId;
  const wordIds = [...s.dirtyWords];
  try {
    const supabase = getSupabase();
    for (let i = 0; i < wordIds.length; i += CHUNK) {
      const chunk = wordIds
        .slice(i, i + CHUNK)
        .map((id) => s.progress[id])
        .filter((p): p is WordProgress => Boolean(p))
        .map((p) => toRow(userId, p));
      if (chunk.length > 0) {
        const { error } = await supabase.from("progress").upsert(chunk);
        if (error) throw error;
      }
    }
    const earnedRows = Object.entries(s.earned).map(([key, earned_at]) => ({
      user_id: userId,
      key,
      earned_at,
    }));
    if (earnedRows.length > 0) {
      const { error: achError } = await supabase
        .from("achievements")
        .upsert(earnedRows, { onConflict: "user_id,key", ignoreDuplicates: true });
      if (achError) throw achError;
    }
    const lessons = Object.entries(s.completedLessons).map(([id, at]) => ({ id, at }));
    const { error } = await supabase.from("stats").upsert({
      user_id: userId,
      xp: s.stats.xp,
      level: s.stats.level,
      streak: s.stats.streak,
      longest_streak: s.stats.longestStreak,
      last_active: s.stats.lastActive,
      gems: s.stats.gems,
      daily_goal: s.stats.dailyGoal,
      lessons_completed: lessons,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    useApp.getState().markSynced(wordIds);
  } catch (err) {
    // Offline-first: leave dirty flags set; the next trigger retries.
    console.warn("wq sync failed", err);
  } finally {
    inflight = false;
  }
}

/** Full round-trip after sign-in: pull, merge, then push the merged state. */
export async function fullSync(userId: string): Promise<void> {
  try {
    await pullAndMerge(userId);
    await pushDirty();
  } catch (err) {
    console.warn("wq full sync failed", err);
  }
}
