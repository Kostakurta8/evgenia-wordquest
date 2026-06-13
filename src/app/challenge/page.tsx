"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Word } from "@/lib/types";
import { loadWordMap } from "@/lib/data";
import { useApp, useT } from "@/lib/store/app";
import { pushDirty } from "@/lib/sync";
import { checkAchievements } from "@/lib/achievements";
import { playSfx, speak } from "@/lib/audio";
import { shuffle } from "@/lib/shuffle";
import Mascot from "@/components/Mascot";
import Exercise, { type Option } from "@/components/lesson/Exercise";

const ROUNDS = 10;
const LIVES = 3;
const SECONDS = 12;
const XP_PER_CORRECT = 4; // double the normal first-try XP
const WIN_GEMS = 10;

interface Task {
  kind: "meaning" | "reverse";
  word: Word;
  choices: { list: Option[]; correctId: number; correctLabel: string };
}

/**
 * Per-task countdown. Mounted with key={pos} so each task starts fresh at
 * SECONDS without any state reset inside effects.
 */
function TaskTimer({
  pausedRef,
  onTimeout,
  label,
}: {
  pausedRef: React.RefObject<boolean>;
  onTimeout: () => void;
  label: string;
}) {
  const [timeLeft, setTimeLeft] = useState(SECONDS);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeLeft((s) => {
        if (pausedRef.current) return s;
        if (s <= 1) {
          window.clearInterval(id);
          onTimeout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex-1 h-3 rounded-full bg-surface-2 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${timeLeft <= 3 ? "bg-danger" : "bg-accent"}`}
          animate={{ width: `${(timeLeft / SECONDS) * 100}%` }}
          transition={{ duration: 0.9, ease: "linear" }}
        />
      </div>
      <span className="sr-only">{label}</span>
      <span className="text-xs font-extrabold text-ink-muted w-8 text-right" aria-hidden>
        {timeLeft}s
      </span>
    </>
  );
}

function roll(kind: Task["kind"], word: Word, pool: Word[]): Task["choices"] {
  const labelOf = (w: Word) => (kind === "meaning" ? w.translation : w.word);
  const taken = new Set([labelOf(word).toLowerCase()]);
  const distractors: Word[] = [];
  for (const cand of shuffle(pool)) {
    if (cand.id === word.id) continue;
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

export default function ChallengePage() {
  const t = useT();
  const { sound, gradeWord, recordMisses, addBonusXp, bumpCounter, awardAchievements } = useApp();

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [phase, setPhase] = useState<"intro" | "playing" | "won" | "lost" | "locked">("intro");
  const [pos, setPos] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [xp, setXp] = useState(0);
  const answered = useRef(false);
  const ended = useRef(false);
  const missed = useRef(new Set<number>());

  // build the round set once
  useEffect(() => {
    let alive = true;
    void (async () => {
      const wordMap = await loadWordMap();
      const s = useApp.getState();
      const learned = Object.values(s.progress)
        .filter((p) => p.timesSeen > 0 || p.status !== "new")
        .map((p) => wordMap.get(p.wordId))
        .filter((w): w is Word => Boolean(w));
      if (!alive) return;
      if (learned.length < ROUNDS) {
        setPhase("locked");
        return;
      }
      const pool = [...wordMap.values()];
      const picked = shuffle(learned).slice(0, ROUNDS);
      setTasks(
        picked.map((w, i) => {
          const kind = i % 2 === 0 ? ("meaning" as const) : ("reverse" as const);
          return { kind, word: w, choices: roll(kind, w, pool) };
        }),
      );
    })();
    return () => {
      alive = false;
    };
     
  }, []);

  function handleResult(correct: boolean, timedOut = false) {
    if (ended.current || !tasks) return;
    const task = tasks[pos];
    gradeWord(task.word.id, correct ? 4 : 1);
    if (!correct) missed.current.add(task.word.id);
    if (correct) setXp((x) => x + XP_PER_CORRECT);

    const nextLives = correct ? lives : lives - 1;
    if (!correct) setLives(nextLives);

    const last = pos + 1 >= tasks.length;
    if (nextLives <= 0) {
      end(false);
    } else if (last && (correct || !timedOut)) {
      end(true);
    } else if (last) {
      end(true);
    } else {
      answered.current = false;
      setPos((p) => p + 1);
    }
  }

  function end(won: boolean) {
    if (ended.current) return;
    ended.current = true;
    const finalXp = won ? xp : Math.floor(xp / 2);
    // One strike per challenge sitting for each word missed → за преговор/трудни.
    recordMisses([...missed.current]);
    addBonusXp(finalXp, won ? WIN_GEMS : 0);
    if (won) {
      bumpCounter("challenges");
      const s = useApp.getState();
      awardAchievements(
        checkAchievements({
          lessonsCompleted: Object.keys(s.completedLessons).length,
          perfectJustNow: false,
          streak: s.stats.streak,
          learnedWords: Object.values(s.progress).filter(
            (p) => p.timesSeen > 0 || p.status !== "new",
          ).length,
          level: s.stats.level,
          regionsCompleted: 0,
          reviews: s.counters.reviews,
          challengesWon: s.counters.challenges,
        }),
      );
    }
    playSfx(won ? "fanfare" : "wrong", !sound);
    setPhase(won ? "won" : "lost");
    void pushDirty();
  }

  if (phase === "locked") {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-4 text-center">
        <Mascot state="encourage" size={90} />
        <p className="text-ink-muted max-w-[280px]">{t("challengeLocked")}</p>
        <Link href="/" className="font-bold text-emerald underline">
          {t("backToMap")}
        </Link>
      </main>
    );
  }

  if (phase === "intro") {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-5 text-center">
        <span className="text-5xl" aria-hidden>
          ⚔️
        </span>
        <h1 className="font-heading text-3xl font-bold">{t("challenge")}</h1>
        <p className="text-ink-muted">{t("challengeIntro")}</p>
        <button
          type="button"
          disabled={!tasks}
          onClick={() => setPhase("playing")}
          className="w-full max-w-sm min-h-14 rounded-2xl bg-accent text-white text-lg font-extrabold shadow-[0_4px_0_0_rgba(0,0,0,0.18)] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-60"
        >
          {t("challengeStart")}
        </button>
        <Link href="/" className="text-sm font-bold text-ink-muted underline">
          {t("backToMap")}
        </Link>
      </main>
    );
  }

  if (phase === "won" || phase === "lost") {
    const won = phase === "won";
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-4 text-center">
        <Mascot state={won ? "celebrate" : "encourage"} size={100} />
        <h1 className="font-heading text-3xl font-bold">
          {won ? t("challengeDone") : t("challengeFailed")}
        </h1>
        <div className="rounded-2xl bg-gold-soft border border-gold/40 px-6 py-3">
          <p className="text-2xl font-extrabold">+{won ? xp : Math.floor(xp / 2)}</p>
          <p className="text-xs font-bold text-ink-muted">{t("xpEarned")}</p>
        </div>
        <div className="flex flex-col gap-2.5 w-full max-w-sm">
          {!won && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-13 rounded-2xl bg-accent text-white font-extrabold"
            >
              {t("tryAgain")} ⚔️
            </button>
          )}
          <Link
            href="/"
            className="min-h-13 rounded-2xl bg-emerald text-emerald-fg font-extrabold flex items-center justify-center"
          >
            {t("backToMap")}
          </Link>
        </div>
      </main>
    );
  }

  if (!tasks) return null;
  const task = tasks[pos];

  return (
    <main className="min-h-dvh flex flex-col px-5 pt-safe max-w-md mx-auto w-full">
      <header className="flex items-center gap-3 py-3">
        <Link href="/" aria-label={t("quitConfirm")} className="w-10 h-10 rounded-full text-ink-muted text-xl font-bold flex items-center justify-center active:bg-surface-2">
          ✕
        </Link>
        <TaskTimer
          key={`timer-${pos}`}
          pausedRef={answered}
          onTimeout={() => handleResult(false, true)}
          label={t("challenge")}
        />
        <span className="font-extrabold text-sm" aria-label={`${lives} ${t("lives")}`}>
          {"❤️".repeat(lives)}
          {"🤍".repeat(LIVES - lives)}
        </span>
      </header>
      <p className="text-center text-xs font-bold text-ink-muted">
        {pos + 1}/{tasks.length}
      </p>

      <Exercise
        key={`ch-${pos}`}
        prompt={
          task.kind === "meaning" ? (
            <div className="text-center">
              <p className="text-sm font-bold text-ink-muted mb-2">{t("meaningPrompt")}</p>
              <button
                type="button"
                onClick={() => speak(task.word.word)}
                className="font-heading text-4xl font-bold inline-flex items-center gap-2 active:scale-95 transition-transform"
              >
                {task.word.word}{" "}
                <span className="text-xl" aria-hidden>
                  🔊
                </span>
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-bold text-ink-muted mb-2">{t("reversePrompt")}</p>
              <p className="font-heading text-3xl font-bold">„{task.word.translation}“</p>
            </div>
          )
        }
        options={task.choices.list}
        correctId={task.choices.correctId}
        correctLabel={task.choices.correctLabel}
        onPicked={() => {
          answered.current = true;
        }}
        onContinue={handleResult}
      />
    </main>
  );
}
