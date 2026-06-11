"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Word } from "@/lib/types";
import { useApp, useT } from "@/lib/store/app";
import { buzz, playSfx } from "@/lib/audio";
import { shuffle } from "@/lib/shuffle";
import { FeedbackFooter } from "@/components/lesson/Exercise";

interface Tile {
  key: string;
  wordId: number;
  label: string;
  side: "en" | "bg";
}

/** Tap-the-Pairs EN↔BG consolidation: match all pairs to finish. */
export default function Pairs({
  words,
  onContinue,
}: {
  words: Word[];
  onContinue: (correct: boolean) => void;
}) {
  const t = useT();
  const sound = useApp((s) => s.sound);
  const tiles = useMemo<Tile[]>(
    () =>
      shuffle(
        words.flatMap((w) => [
          { key: `en-${w.id}`, wordId: w.id, label: w.word, side: "en" as const },
          { key: `bg-${w.id}`, wordId: w.id, label: w.translation, side: "bg" as const },
        ]),
      ),
    [words],
  );
  const [selected, setSelected] = useState<Tile | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [shaking, setShaking] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const done = matched.size === words.length;

  function tap(tile: Tile) {
    if (done || matched.has(tile.wordId)) return;
    if (!selected) {
      setSelected(tile);
      playSfx("tap", !sound);
      return;
    }
    if (selected.key === tile.key) {
      setSelected(null);
      return;
    }
    if (selected.wordId === tile.wordId && selected.side !== tile.side) {
      const next = new Set(matched);
      next.add(tile.wordId);
      setMatched(next);
      setSelected(null);
      playSfx("correct", !sound);
      buzz(15);
    } else {
      setMisses((m) => m + 1);
      setShaking(tile.key);
      setSelected(null);
      playSfx("wrong", !sound);
      buzz([8, 40, 8]);
      window.setTimeout(() => setShaking(null), 350);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 flex flex-col justify-center gap-4 py-4">
        <p className="text-sm font-bold text-ink-muted text-center">{t("pairsPrompt")}</p>
        <div className="grid grid-cols-2 gap-2.5" role="group">
          {tiles.map((tile) => {
            const isMatched = matched.has(tile.wordId);
            const isSelected = selected?.key === tile.key;
            return (
              <motion.button
                key={tile.key}
                type="button"
                onClick={() => tap(tile)}
                disabled={isMatched}
                animate={shaking === tile.key ? { x: [0, -7, 7, -5, 5, 0] } : {}}
                transition={{ duration: 0.32 }}
                className={`min-h-13 rounded-2xl border-2 px-3 py-2 text-sm font-semibold transition-all ${
                  isMatched
                    ? "border-success/40 bg-success-soft text-success opacity-60"
                    : isSelected
                      ? "border-emerald bg-emerald-soft text-emerald scale-[1.03]"
                      : "border-line bg-surface active:bg-surface-2"
                }`}
              >
                {tile.label}
              </motion.button>
            );
          })}
        </div>
      </div>
      {done && (
        <FeedbackFooter correct={misses === 0} onContinue={() => onContinue(misses === 0)} />
      )}
    </div>
  );
}
