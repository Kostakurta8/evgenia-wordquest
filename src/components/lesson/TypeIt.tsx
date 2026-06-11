"use client";

import { useState } from "react";
import type { Word } from "@/lib/types";
import { useApp, useT } from "@/lib/store/app";
import { buzz, playSfx } from "@/lib/audio";
import { headwordBase, isTypedCorrect } from "@/lib/answers";
import { FeedbackFooter } from "@/components/lesson/Exercise";

/** Production: type the English word from its Bulgarian meaning. */
export default function TypeIt({
  word,
  onContinue,
}: {
  word: Word;
  onContinue: (correct: boolean) => void;
}) {
  const t = useT();
  const sound = useApp((s) => s.sound);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<boolean | null>(null);

  function check() {
    if (result !== null || value.trim().length === 0) return;
    const ok = isTypedCorrect(value, [headwordBase(word.word), word.word]);
    setResult(ok);
    playSfx(ok ? "correct" : "wrong", !sound);
    buzz(ok ? 15 : [8, 40, 8]);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 flex flex-col justify-center gap-5 py-4">
        <div className="text-center">
          <p className="text-sm font-bold text-ink-muted mb-2">{t("typePrompt")}</p>
          <p className="font-heading text-3xl font-bold">„{word.translation}“</p>
          <p className="text-sm text-ink-muted mt-2 italic">{word.explanationBg}</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={result !== null}
            placeholder={t("typePlaceholder")}
            aria-label={t("typePrompt")}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={`w-full min-h-14 rounded-2xl border-2 px-4 text-lg font-semibold outline-none bg-surface ${
              result === null
                ? "border-line focus:border-emerald"
                : result
                  ? "border-success bg-success-soft text-success"
                  : "border-danger bg-danger-soft text-danger"
            }`}
          />
          {result === null && (
            <button
              type="submit"
              disabled={value.trim().length === 0}
              className="mt-3 w-full min-h-13 rounded-2xl bg-emerald text-emerald-fg text-lg font-extrabold disabled:opacity-50 shadow-[0_4px_0_0_rgba(0,0,0,0.18)] active:translate-y-0.5 active:shadow-none transition-all"
            >
              {t("check")}
            </button>
          )}
        </form>
      </div>
      {result !== null && (
        <FeedbackFooter
          correct={result}
          correctLabel={headwordBase(word.word)}
          onContinue={() => onContinue(result)}
        />
      )}
    </div>
  );
}
