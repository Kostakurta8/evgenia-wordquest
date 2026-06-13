"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { Journey, Word } from "@/lib/types";
import { findLesson, loadJourney, loadWordMap, type LessonRef } from "@/lib/data";
import { useApp, useT } from "@/lib/store/app";
import { pushDirty } from "@/lib/sync";
import { XP, levelForXp } from "@/lib/xp";
import { checkAchievements } from "@/lib/achievements";
import { playSfx, speak } from "@/lib/audio";
import { pick, shuffle } from "@/lib/shuffle";
import Mascot from "@/components/Mascot";
import WordCard from "@/components/WordCard";
import Exercise, { type Option } from "@/components/lesson/Exercise";
import TypeIt from "@/components/lesson/TypeIt";
import Cloze from "@/components/lesson/Cloze";
import Pairs from "@/components/lesson/Pairs";

type TaskKind =
  | "intro"
  | "meaning"
  | "reverse"
  | "listening"
  | "synonym"
  | "antonym"
  | "typeit"
  | "cloze"
  | "pairs";

interface ChoiceSet {
  list: Option[];
  correctId: number;
  correctLabel: string;
}

interface Task {
  kind: TaskKind;
  wordId: number; // -1 for pairs
  attempt: number;
  /** pre-rolled options for choice tasks (built outside render — shuffling is impure) */
  choices?: ChoiceSet;
}

/** Build the shuffled 4-option set for a choice task. Impure — call from effects/handlers only. */
function rollChoices(kind: TaskKind, word: Word, pool: Word[]): ChoiceSet | undefined {
  if (kind === "meaning" || kind === "reverse" || kind === "listening") {
    const labelOf = (w: Word) => (kind === "meaning" ? w.translation : w.word);
    const taken = new Set([labelOf(word).toLowerCase()]);
    const distractors: Word[] = [];
    for (const cand of pick(pool, pool.length, (x) => x.id === word.id)) {
      const label = labelOf(cand).toLowerCase();
      if (taken.has(label)) continue;
      taken.add(label);
      distractors.push(cand);
      if (distractors.length === 3) break;
    }
    const list = shuffle([word, ...distractors]).map<Option>((w) => ({
      id: w.id,
      label: labelOf(w),
    }));
    return { list, correctId: word.id, correctLabel: labelOf(word) };
  }
  if (kind === "synonym" || kind === "antonym") {
    // Pick the right relation per kind: a synonym (same meaning) or an antonym
    // (opposite). Distractors are *other words'* matching relation so a wrong
    // tap is plausible but unrelated to the prompt word.
    const relOf = (w: Word) => (kind === "synonym" ? w.synonyms : w.antonyms);
    const own = relOf(word);
    if (own.length === 0) return undefined;
    const truth = own[Math.floor(Math.random() * own.length)];
    // Exclude EVERY relation of the prompt word (not just `truth`) so a
    // distractor pulled from another word can never itself be a valid answer
    // here — e.g. dwindle→grow must not show "increase" as a wrong option.
    const taken = new Set([word.word.toLowerCase(), ...own.map((s) => s.toLowerCase())]);
    const distractors: string[] = [];
    for (const cand of shuffle(pool)) {
      if (cand.id === word.id) continue;
      const rel = relOf(cand)[0];
      if (!rel || taken.has(rel.toLowerCase())) continue;
      taken.add(rel.toLowerCase());
      distractors.push(rel);
      if (distractors.length === 3) break;
    }
    const labels = shuffle([truth, ...distractors]);
    return {
      list: labels.map((label, i) => ({ id: i, label })),
      correctId: labels.indexOf(truth),
      correctLabel: truth,
    };
  }
  return undefined;
}

/** Attach pre-rolled choices to every choice task. Impure; effect/handler use only. */
function withChoices(tasks: Task[], words: Word[], pool: Word[]): Task[] {
  return tasks.map((task) => {
    const word = words.find((w) => w.id === task.wordId);
    return word ? { ...task, choices: rollChoices(task.kind, word, pool) } : task;
  });
}

/** rAF count-up for the summary XP number. */
function useCountUp(target: number, ms = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

function SummaryXp({ gained }: { gained: number }) {
  const shown = useCountUp(gained);
  return <p className="text-2xl font-extrabold">+{shown}</p>;
}

function SummaryStars({ accuracy }: { accuracy: number }) {
  const stars = accuracy >= 95 ? 3 : accuracy >= 75 ? 2 : 1;
  return (
    <div className="flex gap-2" aria-label={`${stars}/3`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.25 + i * 0.18, type: "spring", stiffness: 380, damping: 16 }}
          className={`text-4xl ${i < stars ? "" : "grayscale opacity-35"}`}
          aria-hidden
        >
          ⭐
        </motion.span>
      ))}
    </div>
  );
}

interface Loaded {
  ref: LessonRef;
  journey: Journey;
  words: Word[]; // lesson words, book order
  pool: Word[]; // distractor pool (region words)
}

/**
 * Lesson mix: intro (new words) → recognition (meaning / listening, alternating)
 * → a synonym AND an antonym question per word whenever the dictionary has them
 * → production (cloze on the real book sentence, else type-it), production round
 * shuffled, tap-the-pairs consolidation at the end.
 */
function buildTasks(words: Word[], seenBefore: Set<number>): Task[] {
  const tasks: Task[] = [];
  words.forEach((w, i) => {
    if (!seenBefore.has(w.id)) tasks.push({ kind: "intro", wordId: w.id, attempt: 0 });
    const base: TaskKind = i % 2 === 0 ? "meaning" : "listening";
    tasks.push({ kind: base, wordId: w.id, attempt: 0 });
    if (w.synonyms.length > 0) tasks.push({ kind: "synonym", wordId: w.id, attempt: 0 });
    if (w.antonyms.length > 0) tasks.push({ kind: "antonym", wordId: w.id, attempt: 0 });
  });
  const production = words.map<Task>((w) => ({
    kind: w.bookSentenceEn ? "cloze" : "typeit",
    wordId: w.id,
    attempt: 0,
  }));
  const out = [...tasks, ...shuffle(production)];
  if (words.length >= 4) out.push({ kind: "pairs", wordId: -1, attempt: 0 });
  return out;
}

export default function LessonPlayer({ lessonId }: { lessonId: string }) {
  const t = useT();
  const router = useRouter();
  const reduced = useReducedMotion();
  const { sound, introduceWord, gradeWord, recordMisses, completeLesson, awardAchievements, stats } =
    useApp();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [queue, setQueue] = useState<Task[]>([]);
  const [pos, setPos] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [totalCount, setTotalCount] = useState(1);
  const [taskXp, setTaskXp] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [phase, setPhase] = useState<"loading" | "playing" | "summary">("loading");
  const [summary, setSummary] = useState<{
    perfect: boolean;
    levelUp: number | null;
    goalHit: boolean;
    newAchievement: string | null;
  } | null>(null);
  const [quitAsk, setQuitAsk] = useState(false);
  const wrongs = useRef(new Map<number, number>());
  const finished = useRef(false);

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
        words
          .filter((w) => {
            const p = useApp.getState().progress[w.id];
            return p ? p.timesSeen > 0 || p.status !== "new" : false;
          })
          .map((w) => w.id),
      );
      const tasks = withChoices(buildTasks(words, seen), words, pool);
      setLoaded({ ref, journey, words, pool });
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
    () =>
      loaded && task && task.wordId !== -1
        ? (loaded.words.find((w) => w.id === task.wordId) ?? null)
        : null,
    [loaded, task],
  );

  const options: ChoiceSet = task?.choices ?? { list: [], correctId: -1, correctLabel: "" };

  if (phase === "loading" || !loaded || !task) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <Mascot state="idle" size={80} />
      </main>
    );
  }

  function advance(correct: boolean, opts: { isIntro?: boolean; isPairs?: boolean } = {}) {
    const { isIntro = false, isPairs = false } = opts;
    if (!isIntro && !isPairs) {
      setExerciseCount((n) => n + 1);
      if (correct) {
        const first = task.attempt === 0;
        const comboBonus = first && combo + 1 >= 3 ? 1 : 0;
        setTaskXp((x) => x + (first ? XP.firstTryCorrect : XP.retryCorrect) + comboBonus);
        if (first) {
          setFirstTryCorrect((n) => n + 1);
          setCombo((c) => {
            const next = c + 1;
            setBestCombo((b) => Math.max(b, next));
            return next;
          });
        } else {
          setCombo(0);
        }
      } else {
        setCombo(0);
        wrongs.current.set(task.wordId, (wrongs.current.get(task.wordId) ?? 0) + 1);
      }
    }
    if (isPairs) {
      setTaskXp((x) => x + (correct ? XP.firstTryCorrect : XP.retryCorrect));
    }

    if (correct || isIntro || isPairs) {
      setDoneCount((n) => n + 1);
      if (pos + 1 >= queue.length) {
        finish();
        return;
      }
      setPos((p) => p + 1);
    } else {
      setQueue((q) => {
        const next = [...q];
        const retryWord = loaded?.words.find((w) => w.id === task.wordId);
        next.splice(Math.min(pos + 3, next.length), 0, {
          ...task,
          attempt: task.attempt + 1,
          // fresh shuffle so the retry tests meaning, not option position
          choices:
            retryWord && loaded ? rollChoices(task.kind, retryWord, loaded.pool) : task.choices,
        });
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
    // One strike per sitting for every word she got wrong → routes it to
    // за преговор (1st miss) or трудни (2nd miss). See lib/strikes.ts.
    recordMisses([...wrongs.current.keys()]);
    const levelBefore = levelForXp(useApp.getState().stats.xp);
    const goalBefore =
      useApp.getState().stats.todayXp >= useApp.getState().stats.dailyGoal;
    completeLesson(lessonId, { taskXp, perfect });

    const after = useApp.getState();
    const levelAfter = levelForXp(after.stats.xp);
    const goalAfter = after.stats.todayXp >= after.stats.dailyGoal;

    // achievements
    const learnedWords = Object.values(after.progress).filter(
      (p) => p.timesSeen > 0 || p.status !== "new",
    ).length;
    const regionsCompleted = loaded.journey.regions.filter((r) =>
      r.lessons.every((l) => after.completedLessons[l.id]),
    ).length;
    awardAchievements(
      checkAchievements({
        lessonsCompleted: Object.keys(after.completedLessons).length,
        perfectJustNow: perfect,
        streak: after.stats.streak,
        learnedWords,
        level: levelAfter,
        regionsCompleted,
        reviews: after.counters.reviews,
        challengesWon: after.counters.challenges,
      }),
    );

    playSfx("fanfare", !sound);
    setSummary({
      perfect,
      levelUp: levelAfter > levelBefore ? levelAfter : null,
      goalHit: goalAfter && !goalBefore,
      newAchievement: useApp.getState().popPendingAchievement(),
    });
    setPhase("summary");
    void pushDirty();
  }

  if (phase === "summary" && summary) {
    const gained = taskXp + XP.lessonComplete + (summary.perfect ? XP.perfectBonus : 0);
    const accuracy =
      exerciseCount > 0 ? Math.round((firstTryCorrect / exerciseCount) * 100) : 100;
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-4 relative overflow-hidden">
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
        <Mascot state="celebrate" size={104} />
        <h1 className="font-heading text-3xl font-bold text-center">
          {summary.perfect ? t("perfectLesson") : t("lessonComplete")}
        </h1>
        <SummaryStars accuracy={accuracy} />
        <p className="text-ink-muted text-center -mt-2">{t("mascotLessonDone")}</p>

        {summary.levelUp && (
          <motion.p
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-full bg-gold text-ink font-extrabold px-5 py-2"
          >
            ⬆ {t("levelUp")} {summary.levelUp}
          </motion.p>
        )}
        {summary.goalHit && (
          <p className="rounded-full bg-emerald-soft text-emerald font-extrabold px-5 py-2">
            {t("goalReached")}
          </p>
        )}
        {summary.newAchievement && (
          <p className="rounded-full bg-accent-soft text-accent font-extrabold px-5 py-2">
            🏅 {t("achievementUnlocked")}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
          <div className="rounded-2xl bg-gold-soft border border-gold/40 p-3 text-center">
            <SummaryXp gained={gained} />
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

        {bestCombo >= 3 && (
          <p className="text-sm font-bold text-ink-muted">
            ⚡ {t("combo")} ×{bestCombo}
          </p>
        )}

        <div className="flex flex-col gap-2.5 w-full max-w-sm">
          <Link
            href="/"
            className="min-h-14 rounded-2xl bg-emerald text-emerald-fg text-lg font-extrabold flex items-center justify-center shadow-[0_4px_0_0_rgba(0,0,0,0.18)] active:translate-y-0.5 active:shadow-none transition-all"
          >
            {t("backToMap")}
          </Link>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              onClick={() =>
                void navigator
                  .share({ text: `${t("shareText")} +${gained} XP 🔥${stats.streak}` })
                  .catch(() => undefined)
              }
              className="min-h-12 rounded-2xl border-2 border-line font-bold text-ink-muted"
            >
              {t("share")} 💌
            </button>
          )}
        </div>
      </main>
    );
  }

  const pct = Math.round((doneCount / totalCount) * 100);

  return (
    <main className="min-h-dvh flex flex-col px-5 pt-safe max-w-md mx-auto w-full">
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
        {combo >= 2 && (
          <motion.span
            key={combo}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            className="text-sm font-extrabold text-accent"
          >
            ⚡×{combo}
          </motion.span>
        )}
      </header>

      {task.kind === "intro" && word ? (
        <div className="flex-1 flex flex-col justify-center pb-6">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald mb-2">
            ✨ {t("newWord")}
          </p>
          <WordCard
            word={word}
            onGotIt={() => {
              introduceWord(word.id);
              advance(true, { isIntro: true });
            }}
          />
        </div>
      ) : task.kind === "pairs" ? (
        <Pairs
          key={`pairs-${pos}`}
          words={pick(loaded.words, 5, () => false)}
          onContinue={(correct) => advance(correct, { isPairs: true })}
        />
      ) : task.kind === "typeit" && word ? (
        <TypeIt
          key={`typeit-${task.wordId}-${task.attempt}-${pos}`}
          word={word}
          firstTry={task.attempt === 0}
          onContinue={(c) => advance(c)}
        />
      ) : task.kind === "cloze" && word ? (
        <Cloze
          key={`cloze-${task.wordId}-${task.attempt}-${pos}`}
          word={word}
          firstTry={task.attempt === 0}
          onContinue={(c) => advance(c)}
        />
      ) : word ? (
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
                  {word.word}{" "}
                  <span className="text-xl" aria-hidden>
                    🔊
                  </span>
                </button>
                <p className="text-ink-muted text-sm mt-1">{word.ipa}</p>
              </div>
            ) : task.kind === "reverse" ? (
              <div className="text-center">
                <p className="text-sm font-bold text-ink-muted mb-2">{t("reversePrompt")}</p>
                <p className="font-heading text-3xl font-bold">„{word.translation}“</p>
              </div>
            ) : task.kind === "synonym" || task.kind === "antonym" ? (
              <div className="text-center">
                <p className="text-sm font-bold text-ink-muted mb-2">
                  {t(task.kind === "synonym" ? "synonymPrompt" : "antonymPrompt")}{" "}
                  <strong className="text-ink">{word.word}</strong>?
                </p>
                <p className="text-sm text-emerald font-semibold">{word.translation}</p>
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
          options={options.list}
          correctId={options.correctId}
          correctLabel={options.correctLabel}
          speakOnMount={task.kind === "listening" ? word.word : undefined}
          firstTry={task.attempt === 0}
          onContinue={(correct) => advance(correct)}
        />
      ) : null}

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
