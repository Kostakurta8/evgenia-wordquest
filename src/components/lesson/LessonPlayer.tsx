"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { Word } from "@/lib/types";
import { findLesson, loadJourney, loadWordMap, type LessonRef } from "@/lib/data";
import { useApp, useT } from "@/lib/store/app";
import { pushDirty } from "@/lib/sync";
import { XP } from "@/lib/xp";
import { playSfx, speak } from "@/lib/audio";
import { pick, shuffle } from "@/lib/shuffle";
import Mascot from "@/components/Mascot";
import WordCard from "@/components/WordCard";
import Exercise, { type Option } from "@/components/lesson/Exercise";

type TaskKind = "intro" | "meaning" | "reverse" | "listening";
interface Task {
  kind: TaskKind;
  wordId: number;
  attempt: number;
}

interface Loaded {
  ref: LessonRef;
  words: Word[]; // lesson words, book order
  pool: Word[]; // distractor pool (region words)
}

function buildTasks(words: Word[], seenBefore: Set<number>): Task[] {
  const tasks: Task[] = [];
  for (const w of words) {
    if (!seenBefore.has(w.id)) tasks.push({ kind: "intro", wordId: w.id, attempt: 0 });
    tasks.push({ kind: "meaning", wordId: w.id, attempt: 0 });
  }
  const second = words.map<Task>((w, i) => ({
    kind: i % 2 === 0 ? "listening" : "reverse",
    wordId: w.id,
    attempt: 0,
  }));
  return [...tasks, ...shuffle(second)];
}

export default function LessonPlayer({ lessonId }: { lessonId: string }) {
  const t = useT();
  const router = useRouter();
  const reduced = useReducedMotion();
  const { sound, introduceWord, gradeWord, completeLesson, stats } = useApp();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [queue, setQueue] = useState<Task[]>([]);
  const [pos, setPos] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(1);
  const [taskXp, setTaskXp] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [phase, setPhase] = useState<"loading" | "playing" | "summary">("loading");
  const [summaryPerfect, setSummaryPerfect] = useState(false);
  const [quitAsk, setQuitAsk] = useState(false);
  const wrongs = useRef(new Map<number, number>());
  const finished = useRef(false);

  // load data once
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [journey, wordMap] = await Promise.all([loadJourney(), loadWordMap()]);
      const ref = findLesson(journey, lessonId);
      if (!ref || !alive) return;
      const words = ref.lesson.wordIds
        .map((id) => wordMap.get(id))
        .filter((w): w is Word => Boolean(w));
      const pool = ref.region.lessons
        .flatMap((l) => l.wordIds)
        .map((id) => wordMap.get(id))
        .filter((w): w is Word => Boolean(w));
      const seen = new Set(
        words.filter((w) => (useApp.getState().progress[w.id]?.timesSeen ?? 0) > 0).map((w) => w.id),
      );
      const tasks = buildTasks(words, seen);
      setLoaded({ ref, words, pool });
      setQueue(tasks);
      setTotalCount(tasks.length);
      setPhase("playing");
    })();
    return () => {
      alive = false;
    };
     
  }, [lessonId]);

  const task = queue[pos];
  const word = useMemo(
    () => (loaded && task ? loaded.words.find((w) => w.id === task.wordId) ?? null : null),
    [loaded, task],
  );

  // 4 options: target + 3 distractors from the region pool, always shuffled
  const options = useMemo(() => {
    if (!loaded || !task || !word || task.kind === "intro") return [];
    const labelOf = (w: Word) => (task.kind === "meaning" ? w.translation : w.word);
    const taken = new Set([labelOf(word).toLowerCase()]);
    const distractors: Word[] = [];
    for (const cand of pick(loaded.pool, loaded.pool.length, (x) => x.id === word.id)) {
      const label = labelOf(cand).toLowerCase();
      if (taken.has(label)) continue;
      taken.add(label);
      distractors.push(cand);
      if (distractors.length === 3) break;
    }
    return shuffle([word, ...distractors]).map<Option>((w) => ({ id: w.id, label: labelOf(w) }));
    // re-roll options for retries of the same task
     
  }, [loaded, task, word]);

  if (phase === "loading" || !loaded || !task || !word) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <Mascot state="idle" size={80} />
      </main>
    );
  }

  function advance(correct: boolean, isIntro = false) {
    if (!isIntro) {
      setExerciseCount((n) => n + 1);
      if (correct) {
        const first = task.attempt === 0;
        setTaskXp((x) => x + (first ? XP.firstTryCorrect : XP.retryCorrect));
        if (first) setFirstTryCorrect((n) => n + 1);
      } else {
        wrongs.current.set(task.wordId, (wrongs.current.get(task.wordId) ?? 0) + 1);
      }
    }

    if (correct || isIntro) {
      setDoneCount((n) => n + 1);
      if (pos + 1 >= queue.length) {
        finish();
        return;
      }
      setPos((p) => p + 1);
    } else {
      // re-queue the same task a few steps later
      setQueue((q) => {
        const next = [...q];
        const retry: Task = { ...task, attempt: task.attempt + 1 };
        next.splice(Math.min(pos + 3, next.length), 0, retry);
        return next;
      });
      setPos((p) => p + 1);
    }
  }

  function finish() {
    if (finished.current || !loaded) return;
    finished.current = true;
    const perfect = wrongs.current.size === 0;
    for (const w of loaded.words) {
      const misses = wrongs.current.get(w.id) ?? 0;
      gradeWord(w.id, misses === 0 ? 5 : 3);
    }
    completeLesson(lessonId, { taskXp, perfect });
    playSfx("fanfare", !sound);
    setSummaryPerfect(perfect);
    setPhase("summary");
    void pushDirty();
  }

  if (phase === "summary") {
    const perfect = summaryPerfect;
    const gained = taskXp + XP.lessonComplete + (perfect ? XP.perfectBonus : 0);
    const accuracy =
      exerciseCount > 0 ? Math.round((firstTryCorrect / exerciseCount) * 100) : 100;
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-5 relative overflow-hidden">
        {!reduced && (
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {Array.from({ length: 26 }, (_, i) => (
              <motion.span
                key={i}
                className="absolute top-[-5%] text-xl"
                style={{ left: `${(i * 37) % 100}%` }}
                initial={{ y: "-10vh", rotate: 0, opacity: 1 }}
                animate={{ y: "110vh", rotate: 360 + (i % 3) * 120, opacity: [1, 1, 0.6] }}
                transition={{ duration: 2.6 + (i % 5) * 0.4, delay: (i % 7) * 0.12, ease: "easeIn" }}
              >
                {["✨", "🎉", "⭐", "💛", "🍃"][i % 5]}
              </motion.span>
            ))}
          </div>
        )}
        <Mascot state="celebrate" size={110} />
        <h1 className="font-heading text-3xl font-bold text-center">
          {perfect ? t("perfectLesson") : t("lessonComplete")}
        </h1>
        <p className="text-ink-muted text-center -mt-2">{t("mascotLessonDone")}</p>

        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
          <div className="rounded-2xl bg-gold-soft border border-gold/40 p-3 text-center">
            <p className="text-2xl font-extrabold">+{gained}</p>
            <p className="text-xs font-bold text-ink-muted">{t("xpEarned")}</p>
          </div>
          <div className="rounded-2xl bg-emerald-soft p-3 text-center">
            <p className="text-2xl font-extrabold text-emerald">{accuracy}%</p>
            <p className="text-xs font-bold text-ink-muted">{t("accuracy")}</p>
          </div>
          <div className="rounded-2xl bg-accent-soft p-3 text-center">
            <p className="text-2xl font-extrabold text-accent">🔥 {stats.streak}</p>
            <p className="text-xs font-bold text-ink-muted">{t("dayStreak")}</p>
          </div>
        </div>

        <Link
          href="/"
          className="w-full max-w-sm min-h-14 rounded-2xl bg-emerald text-emerald-fg text-lg font-extrabold flex items-center justify-center shadow-[0_4px_0_0_rgba(0,0,0,0.18)] active:translate-y-0.5 active:shadow-none transition-all"
        >
          {t("backToMap")}
        </Link>
      </main>
    );
  }

  const pct = Math.round((doneCount / totalCount) * 100);

  return (
    <main className="min-h-dvh flex flex-col px-5 pt-safe max-w-md mx-auto w-full">
      {/* header: quit + mastery bar */}
      <header className="flex items-center gap-3 py-3">
        <button
          type="button"
          aria-label={t("quitLesson")}
          onClick={() => setQuitAsk(true)}
          className="w-10 h-10 rounded-full text-ink-muted text-xl font-bold active:bg-surface-2"
        >
          ✕
        </button>
        <div
          className="flex-1 h-4 rounded-full bg-surface-2 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded-full bg-gold"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </header>

      {task.kind === "intro" ? (
        <div className="flex-1 flex flex-col justify-center pb-6">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald mb-2">
            ✨ {t("newWord")}
          </p>
          <WordCard word={word} onGotIt={() => {
            introduceWord(word.id);
            advance(true, true);
          }} />
        </div>
      ) : (
        <Exercise
          key={`${task.kind}-${task.wordId}-${task.attempt}-${pos}`}
          prompt={
            task.kind === "meaning" ? (
              <div className="text-center">
                <p className="text-sm font-bold text-ink-muted mb-2">{t("meaningPrompt")}</p>
                <button
                  type="button"
                  onClick={() => speak(word.word)}
                  className="font-heading text-4xl font-bold inline-flex items-center gap-2 active:scale-95 transition-transform"
                >
                  {word.word} <span className="text-xl" aria-hidden>🔊</span>
                </button>
                <p className="text-ink-muted text-sm mt-1">{word.ipa}</p>
              </div>
            ) : task.kind === "reverse" ? (
              <div className="text-center">
                <p className="text-sm font-bold text-ink-muted mb-2">{t("reversePrompt")}</p>
                <p className="font-heading text-3xl font-bold">„{word.translation}“</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-bold text-ink-muted mb-3">{t("listenPrompt")}</p>
                <button
                  type="button"
                  onClick={() => speak(word.word)}
                  aria-label={t("playAgain")}
                  className="w-24 h-24 rounded-full bg-emerald text-4xl text-emerald-fg shadow-[0_5px_0_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none transition-all"
                >
                  🔊
                </button>
              </div>
            )
          }
          options={options}
          correctId={word.id}
          correctLabel={task.kind === "meaning" ? word.translation : word.word}
          speakOnMount={task.kind === "listening" ? word.word : undefined}
          onContinue={(correct) => advance(correct)}
        />
      )}

      {/* quit confirmation */}
      {quitAsk && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-8">
          <div className="rounded-3xl bg-surface p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-heading text-xl font-bold">{t("quitLesson")}</h2>
            <p className="text-ink-muted text-sm">{t("quitLessonBody")}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setQuitAsk(false)}
                className="flex-1 min-h-12 rounded-2xl bg-emerald text-emerald-fg font-bold"
              >
                {t("quitCancel")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex-1 min-h-12 rounded-2xl border-2 border-line font-bold text-ink-muted"
              >
                {t("quitConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
