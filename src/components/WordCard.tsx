"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Word } from "@/lib/types";
import { useApp, useT } from "@/lib/store/app";
import { playSfx, speak } from "@/lib/audio";
import Mascot from "@/components/Mascot";

/** Renders a book sentence with the **highlighted** word in emerald bold. */
export function HighlightedSentence({ sentence }: { sentence: string }) {
  const parts = sentence.split("**");
  return (
    <p className="text-[15px] leading-relaxed">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="text-emerald font-extrabold">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

function SpeakButton({ text, label, big = false }: { text: string; label: string; big?: boolean }) {
  const sound = useApp((s) => s.sound);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        playSfx("tap", !sound);
        speak(text);
      }}
      className={`shrink-0 rounded-full bg-emerald-soft text-emerald flex items-center justify-center active:scale-90 transition-transform ${
        big ? "w-12 h-12 text-2xl" : "w-9 h-9 text-lg"
      }`}
    >
      🔊
    </button>
  );
}

function Chips({ label, items, tone }: { label: string; items: string[]; tone: "emerald" | "accent" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => (
          <span
            key={s}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              tone === "emerald" ? "bg-emerald-soft text-emerald" : "bg-accent-soft text-accent"
            }`}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The heart of the app: full introduction of a word before it is drilled.
 * `onGotIt` turns it into the in-lesson intro step; without it the card is
 * a read-only view (Lexicon).
 */
export default function WordCard({
  word,
  onGotIt,
  mascotLine,
}: {
  word: Word;
  onGotIt?: () => void;
  mascotLine?: string;
}) {
  const t = useT();
  const [showEn, setShowEn] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl bg-surface border border-line p-5 shadow-sm flex flex-col gap-4"
    >
      {/* headword */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-3xl font-bold break-words">{word.word}</h2>
          <p className="text-ink-muted text-sm mt-0.5">{word.ipa}</p>
        </div>
        <SpeakButton big text={word.word} label={t("tapToHear")} />
      </div>

      {/* explanation with BG/EN toggle */}
      <div className="rounded-2xl bg-surface-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-base leading-relaxed flex-1">
            {showEn ? word.explanationEn : word.explanationBg}
          </p>
          <button
            type="button"
            onClick={() => setShowEn((v) => !v)}
            className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-bold text-ink-muted active:scale-95"
            aria-pressed={showEn}
          >
            {showEn ? "БГ" : "EN"}
          </button>
        </div>
        <p className="mt-2 text-sm font-semibold text-emerald">{word.translation}</p>
      </div>

      {/* fresh example */}
      <div className="flex items-center gap-2">
        <SpeakButton text={word.exampleEn} label={t("tapToHear")} />
        <p className="text-[15px] italic text-ink-muted leading-relaxed">{word.exampleEn}</p>
      </div>

      {/* real book sentence */}
      {word.bookSentenceEn && (
        <div className="rounded-2xl bg-gold-soft border border-gold/40 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-1.5">
            📖 {t("fromBook")} {word.bookSentenceRef}
          </p>
          <HighlightedSentence sentence={word.bookSentenceEn} />
        </div>
      )}

      <Chips label={t("synonyms")} items={word.synonyms} tone="emerald" />
      <Chips label={t("antonyms")} items={word.antonyms} tone="accent" />

      {/* mnemonic */}
      <div className="rounded-2xl bg-teal-soft p-4 flex items-start gap-3">
        <span className="text-xl" aria-hidden>
          💡
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-1">
            {t("mnemonic")}
          </p>
          <p className="text-[15px] leading-relaxed">{word.mnemonicBg}</p>
        </div>
      </div>

      {/* mascot + CTA */}
      {onGotIt && (
        <div className="flex items-center gap-3 mt-1">
          <Mascot state="encourage" size={56} />
          <p className="flex-1 text-sm text-ink-muted">{mascotLine ?? t("mascotNewWord")}</p>
        </div>
      )}
      {onGotIt && (
        <button
          type="button"
          onClick={onGotIt}
          className="w-full min-h-14 rounded-2xl bg-emerald text-emerald-fg text-lg font-extrabold shadow-[0_4px_0_0_rgba(0,0,0,0.18)] active:translate-y-0.5 active:shadow-none transition-all"
        >
          {t("gotIt")}
        </button>
      )}
    </motion.article>
  );
}
