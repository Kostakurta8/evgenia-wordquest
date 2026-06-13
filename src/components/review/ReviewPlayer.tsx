"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Word } from "@/lib/types";
import { loadWordMap } from "@/lib/data";
import { useApp, useT } from "@/lib/store/app";
import { pushDirty } from "@/lib/sync";
import { XP } from "@/lib/xp";
import { isDue } from "@/lib/srs";
import { checkAchievements } from "@/lib/achievements";
import { playSfx, speak } from "@/lib/audio";
import { shuffle } from "@/lib/shuffle";
import Mascot from "@/components/Mascot";
import Exercise, { type Option } from "@/components/lesson/Exercise";
import TypeIt from "@/components/lesson/TypeIt";
import Cloze from "@/components/lesson/Cloze";

const SESSION_CAP = 20;

type Kind = "meaning" | "reverse" | "listening" | "cloze" | "typeit" | "synonym" | "antonym";

interface Task {
  kind: Kind;
  wordId: number;
  attempt: number;
  choices?: { list: Option[]; correctId: number; correctLabel: string };
}

function rollChoices(kind: Kind, word: Word, pool: Word[]) {
  if (kind === "cloze" || kind === "typeit") return undefined;
  if (kind === "synonym" || kind === "antonym") {
    const relOf = (w: Word) => (kind === "synonym" ? w.synonyms : w.antonyms);
    const own = relOf(word);
    if (own.length === 0) return undefined;
    const truth = own[Math.floor(Math.random() * own.length)];
    // Exclude EVERY relation of the prompt word so no distractor is itself a
    // valid answer (see LessonPlayer.rollChoices).
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

/**
 * Runs exactly the due SRS items (capped), one rotating task per word.
 * Pass `wordIds` to practice an explicit set instead (e.g. the hard-words deck).
 */
export default function ReviewPlayer({
  onExit,
  wordIds,
}: {
  onExit: () => void;
  wordIds?: number[];
}) {
  const t = useT();
  const reduced = useReducedMotion();
  const { sound, gradeWord, recordMisses, addBonusXp, bumpCounter, awardAchievements } = useApp();

  const [words, setWords] = useState<Word[] | null>(null);
  const [pool, setPool] = useState<Word[]>([]);
  const [queue, setQueue] = useState<Task[]>([]);
  const [pos, setPos] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [taskXp, setTaskXp] = useState(0);
  const [finishedCount, setFinishedCount] = useState(0);
  const [phase, setPhase] = useState<"loading" | "playing" | "summary">("loading");
  const wrongs = useRef(new Map<number, number>());
  const finished = useRef(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const wordMap = await loadWordMap();
      const s = useApp.getState();
      const due = (
        wordIds ??
        Object.values(s.progress)
          .filter((p) => isDue(p))
          .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
          .slice(0, SESSION_CAP)
          .map((p) => p.wordId)
      )
        .map((id) => wordMap.get(id))
        .filter((w): w is Word => Boolean(w));
      if (!alive) return;
      if (due.length === 0) {
        onExit();
        return;
      }
      const all = [...wordMap.values()];
      const tasks = shuffle(due).map<Task>((w, i) => {
        // One rotating recall task per word; synonym/antonym join the rotation
        // only when the dictionary has that relation for the word.
        const kinds: Kind[] = [w.bookSentenceEn ? "cloze" : "typeit", "listening", "reverse", "meaning"];
        if (w.synonyms.length > 0) kinds.push("synonym");
        if (w.antonyms.length > 0) kinds.push("antonym");
        const kind = kinds[i % kinds.length];
        return { kind, wordId: w.id, attempt: 0, choices: rollChoices(kind, w, all) };
      });
      setWords(due);
      setPool(all);
      setQueue(tasks);
      setPhase("playing");
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const task = queue[pos];
  const word = words?.find((w) => w.id === task?.wordId) ?? null;

  function advance(correct: boolean) {
    if (!task) return;
    if (correct) {
      const first = task.attempt === 0;
      setTaskXp((x) => x + (first ? XP.firstTryCorrect : XP.retryCorrect));
      setDoneCount((n) => n + 1);
      if (pos + 1 >= queue.length) {
        finish();
        return;
      }
      setPos((p) => p + 1);
    } else {
      wrongs.current.set(task.wordId, (wrongs.current.get(task.wordId) ?? 0) + 1);
      setQueue((q) => {
        const next = [...q];
        const retryWord = words?.find((w) => w.id === task.wordId);
        next.splice(Math.min(pos + 3, next.length), 0, {
          ...task,
          attempt: task.attempt + 1,
          choices: retryWord ? rollChoices(task.kind, retryWord, pool) : task.choices,
        });
        return next;
      });
      setPos((p) => p + 1);
    }
  }

  function finish() {
    if (finished.current || !words) return;
    finished.current = true;
    for (const w of words) {
      const misses = wrongs.current.get(w.id) ?? 0;
      gradeWord(w.id, misses === 0 ? 5 : 3);
    }
    // Strike words missed this sitting → 1st miss = за преговор, 2nd = трудни.
    recordMisses([...wrongs.current.keys()]);
    addBonusXp(taskXp);
    bumpCounter("reviews");
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
    setFinishedCount(words.length);
    playSfx("fanfare", !sound);
    setPhase("summary");
    void pushDirty();
  }

  if (phase === "loading" || !task || !word) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Mascot state="idle" size={80} />
      </div>
    );
  }

  if (phase === "summary") {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 gap-4">
        <Mascot state="celebrate" size={100} />
        <h1 className="font-heading text-3xl font-bold text-center">{t("reviewDone")}</h1>
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          <div className="rounded-2xl bg-gold-soft border border-gold/40 p-3 text-center">
            <p className="text-2xl font-extrabold">+{taskXp}</p>
            <p className="text-xs font-bold text-ink-muted">{t("xpEarned")}</p>
          </div>
          <div className="rounded-2xl bg-emerald-soft p-3 text-center">
            <p className="text-2xl font-extrabold text-emerald">{finishedCount}</p>
            <p className="text-xs font-bold text-ink-muted">{t("reviewedWords")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="w-full max-w-sm min-h-14 rounded-2xl bg-emerald text-emerald-fg text-lg font-extrabold shadow-[0_4px_0_0_rgba(0,0,0,0.18)] active:translate-y-0.5 active:shadow-none transition-all"
        >
          {t("continueBtn")}
        </button>
      </main>
    );
  }

  const total = queue.length;
  const pct = Math.round((doneCount / total) * 100);

  return (
    <main className="min-h-dvh flex flex-col px-5 pt-safe max-w-md mx-auto w-full">
      <header className="flex items-center gap-3 py-3">
        <button
          type="button"
          aria-label={t("quitLesson")}
          onClick={onExit}
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
            className="h-full rounded-full bg-teal"
            animate={{ width: `${pct}%` }}
            transition={{ duration: reduced ? 0 : 0.35 }}
          />
        </div>
      </header>

      {task.kind === "typeit" ? (
        <TypeIt
          key={`typeit-${task.wordId}-${task.attempt}-${pos}`}
          word={word}
          onContinue={advance}
        />
      ) : task.kind === "cloze" ? (
        <Cloze
          key={`cloze-${task.wordId}-${task.attempt}-${pos}`}
          word={word}
          onContinue={advance}
        />
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
          options={task.choices?.list ?? []}
          correctId={task.choices?.correctId ?? -1}
          correctLabel={task.choices?.correctLabel ?? ""}
          speakOnMount={task.kind === "listening" ? word.word : undefined}
          onContinue={advance}
        />
      )}
    </main>
  );
}
