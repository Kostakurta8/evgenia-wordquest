"use client";

import { useState } from "react";
import type { Word } from "@/lib/types";
import { useApp, useT } from "@/lib/store/app";
import { buzz, playSfx } from "@/lib/audio";
import { clozeText, headwordBase, highlightedForm, isTypedCorrect } from "@/lib/answers";
import { FeedbackFooter } from "@/components/lesson/Exercise";

/**
 * ★ Context Cloze — the real book sentence with the word blanked out.
 * Accepts the inflected surface form or the headword (lenient typing).
 */
export default function Cloze({
  word,
  onContinue,
  firstTry,
}: {
  word: Word;
  onContinue: (correct: boolean) => void;
  firstTry?: boolean;
}) {
  const t = useT();
  const sound = useApp((s) => s.sound);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<boolean | null>(null);

  const sentence = word.bookSentenceEn ?? "";
  const surface = highlightedForm(sentence) ?? headwordBase(word.word);

  function check() {
    if (result !== null || value.trim().length === 0) return;
    const ok = isTypedCorrect(value, [surface, headwordBase(word.word), word.word]);
    setResult(ok);
    playSfx(ok ? "correct" : "wrong", !sound);
    buzz(ok ? 15 : [8, 40, 8]);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 flex flex-col justify-center gap-5 py-4">
        <div>
          <p className="text-sm font-bold text-ink-muted mb-2 text-center">{t("clozePrompt")}</p>
          <div className="rounded-2xl bg-gold-soft border border-gold/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-1.5">
              📖 {t("fromBook")} {word.bookSentenceRef}
            </p>
            <p className="text-[15px] leading-relaxed">{clozeText(sentence)}</p>
          </div>
          <p className="text-sm text-emerald font-semibold text-center mt-3">
            {word.translation}
          </p>
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
            aria-label={t("clozePrompt")}
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
          correctLabel={surface}
          firstTry={firstTry}
          onContinue={() => onContinue(result)}
        />
      )}
    </div>
  );
}
