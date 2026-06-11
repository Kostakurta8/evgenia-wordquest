"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useApp, useT } from "@/lib/store/app";
import { buzz, playSfx, speak } from "@/lib/audio";

export interface Option {
  id: number;
  label: string;
}

/** Shared green/red result banner + Continue button (slides up from bottom). */
export function FeedbackFooter({
  correct,
  correctLabel,
  onContinue,
}: {
  correct: boolean;
  /** shown after a miss; omit to hide the "correct answer was" line */
  correctLabel?: string;
  onContinue: () => void;
}) {
  const t = useT();
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 38 }}
      className={`-mx-5 px-5 pt-4 pb-safe ${correct ? "bg-success-soft" : "bg-danger-soft"}`}
    >
      <div className="pb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {correct ? "✅" : "💪"}
          </span>
          <div>
            <p className={`font-extrabold ${correct ? "text-success" : "text-danger"}`}>
              {correct ? t("correct") : t("wrong")}
            </p>
            {!correct && correctLabel && (
              <p className="text-sm text-ink">
                {t("correctAnswerWas")} <strong>{correctLabel}</strong>
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          autoFocus
          onClick={onContinue}
          className={`w-full min-h-13 rounded-2xl text-lg font-extrabold text-white shadow-[0_4px_0_0_rgba(0,0,0,0.18)] active:translate-y-0.5 active:shadow-none transition-all ${
            correct ? "bg-success" : "bg-danger"
          }`}
        >
          {t("continueBtn")}
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Shared tap-to-answer exercise: prompt on top, 2×2 / stacked options below,
 * instant feedback, then a Continue footer. Used by all P2 exercise types.
 */
export default function Exercise({
  prompt,
  options,
  correctId,
  correctLabel,
  onContinue,
  speakOnMount,
  onPicked,
}: {
  prompt: ReactNode;
  options: Option[];
  correctId: number;
  correctLabel: string;
  onContinue: (correct: boolean) => void;
  /** listening tasks speak this on mount (after first user gesture it works everywhere) */
  speakOnMount?: string;
  /** fires the moment an option is tapped (e.g. to stop a challenge timer) */
  onPicked?: (correct: boolean) => void;
}) {
  const sound = useApp((s) => s.sound);
  const [picked, setPicked] = useState<number | null>(null);
  const submitted = picked !== null;
  const correct = picked === correctId;

  useEffect(() => {
    if (speakOnMount) speak(speakOnMount);
  }, [speakOnMount]);

  function choose(id: number) {
    if (submitted) return;
    setPicked(id);
    const ok = id === correctId;
    onPicked?.(ok);
    playSfx(ok ? "correct" : "wrong", !sound);
    buzz(ok ? 15 : [8, 40, 8]);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 flex flex-col justify-center gap-6 py-4">
        {prompt}
        <div className="flex flex-col gap-3" role="group">
          {options.map((opt) => {
            const isPicked = picked === opt.id;
            const isCorrect = submitted && opt.id === correctId;
            const isWrongPick = submitted && isPicked && !isCorrect;
            return (
              <motion.button
                key={opt.id}
                type="button"
                whileTap={submitted ? undefined : { scale: 0.97 }}
                onClick={() => choose(opt.id)}
                disabled={submitted}
                className={`min-h-14 rounded-2xl border-2 px-4 py-3 text-left text-base font-semibold transition-colors ${
                  isCorrect
                    ? "border-success bg-success-soft text-success"
                    : isWrongPick
                      ? "border-danger bg-danger-soft text-danger"
                      : "border-line bg-surface active:bg-surface-2"
                }`}
              >
                {opt.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {submitted && (
        <FeedbackFooter
          correct={correct}
          correctLabel={correctLabel}
          onContinue={() => onContinue(correct)}
        />
      )}
    </div>
  );
}
