"use client";

import { useEffect, useMemo, useState } from "react";
import type { Word } from "@/lib/types";
import { loadWords } from "@/lib/data";
import { useApp, useT } from "@/lib/store/app";
import WordCard from "@/components/WordCard";

const PAGE = 60;

export default function LexiconPage() {
  const t = useT();
  const [words, setWords] = useState<Word[] | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const progress = useApp((s) => s.progress);

  useEffect(() => {
    void loadWords().then(setWords);
  }, []);

  const learnedCount = useMemo(
    () => Object.values(progress).filter((p) => p.timesSeen > 0 || p.status !== "new").length,
    [progress],
  );

  const filtered = useMemo(() => {
    if (!words) return [];
    const q = query.trim().toLowerCase();
    if (!q) return words;
    return words.filter(
      (w) =>
        w.word.toLowerCase().includes(q) ||
        w.translation.toLowerCase().includes(q) ||
        w.synonyms.some((s) => s.toLowerCase().includes(q)),
    );
  }, [words, query]);

  return (
    <main className="mx-auto max-w-md px-5 pt-safe pb-8">
      <div className="flex items-baseline justify-between py-4">
        <h1 className="font-heading text-2xl font-bold">{t("lexiconTitle")}</h1>
        <p className="text-sm font-bold text-emerald">
          {learnedCount}/1177 {t("learned")}
        </p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="w-full min-h-12 rounded-2xl border-2 border-line bg-surface px-4 text-base outline-none focus:border-emerald"
      />

      <ul className="mt-4 flex flex-col gap-2">
        {filtered.slice(0, PAGE).map((w) => {
          const p = progress[w.id];
          const learned = Boolean(p && (p.timesSeen > 0 || p.status !== "new"));
          const open = openId === w.id;
          return (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : w.id)}
                aria-expanded={open}
                className="w-full rounded-2xl border border-line bg-surface px-4 py-3 flex items-center gap-3 text-left active:bg-surface-2"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${learned ? "bg-emerald" : "bg-line"}`}
                  title={learned ? t("learned") : t("notSeenYet")}
                />
                <span className="font-bold flex-1 min-w-0 truncate">{w.word}</span>
                <span className="text-sm text-ink-muted truncate max-w-[40%]">{w.translation}</span>
              </button>
              {open && (
                <div className="mt-2">
                  <WordCard word={w} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 && words && (
        <p className="text-center text-ink-muted py-10">{t("noResults")}</p>
      )}
      {filtered.length > PAGE && (
        <p className="text-center text-xs text-ink-muted py-4">
          {PAGE} / {filtered.length}
        </p>
      )}
    </main>
  );
}
