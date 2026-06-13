"use client";

import { useEffect, useMemo, useState } from "react";
import type { Word } from "@/lib/types";
import { loadWords } from "@/lib/data";
import { useApp, useT } from "@/lib/store/app";
import { isHard, needsReview } from "@/lib/strikes";
import { isDue } from "@/lib/srs";
import Mascot from "@/components/Mascot";
import WordCard from "@/components/WordCard";

const PAGE = 80;

type Filter = "all" | "learned" | "hard" | "due";

function isLearned(p: { timesSeen: number; status: string } | undefined): boolean {
  return Boolean(p && (p.timesSeen > 0 || p.status !== "new"));
}

/** Case/diacritic-insensitive fold that keeps Cyrillic intact (unlike the
 * typed-answer normalizer, which is Latin-only and would blank BG queries). */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Search rank: 0 = no match; higher is better. */
function rank(w: Word, q: string): number {
  const en = fold(w.word);
  const bg = fold(w.translation);
  if (en.startsWith(q) || bg.startsWith(q)) return 4;
  if (en.includes(q) || bg.includes(q)) return 3;
  if (w.synonyms.some((s) => fold(s).includes(q))) return 2;
  if (fold(w.definition).includes(q) || fold(w.explanationBg).includes(q)) return 1;
  return 0;
}

export default function LexiconPage() {
  const t = useT();
  const [words, setWords] = useState<Word[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const progress = useApp((s) => s.progress);

  function load() {
    loadWords()
      .then(setWords)
      .catch(() => setFailed(true));
  }
  useEffect(load, []);
  function retry() {
    setFailed(false);
    load();
  }

  const learnedCount = useMemo(
    () => Object.values(progress).filter((p) => isLearned(p)).length,
    [progress],
  );

  const filtered = useMemo(() => {
    if (!words) return [];
    let list = words;
    if (filter === "learned") list = list.filter((w) => isLearned(progress[w.id]));
    else if (filter === "hard") list = list.filter((w) => Boolean(progress[w.id]) && isHard(progress[w.id]));
    else if (filter === "due")
      list = list.filter((w) => {
        const p = progress[w.id];
        return Boolean(p) && (needsReview(p) || isDue(p));
      });
    const q = fold(query.trim());
    if (!q) return list;
    return list
      .map((w) => ({ w, r: rank(w, q) }))
      .filter((x) => x.r > 0)
      .sort((a, b) => b.r - a.r || a.w.id - b.w.id)
      .map((x) => x.w);
  }, [words, query, filter, progress]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: t("filterAll") },
    { key: "learned", label: t("filterLearned") },
    { key: "hard", label: t("filterHard") },
    { key: "due", label: t("filterDue") },
  ];

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
        onChange={(e) => {
          setQuery(e.target.value);
          setLimit(PAGE);
        }}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="w-full min-h-12 rounded-2xl border-2 border-line bg-surface px-4 text-base outline-none focus:border-emerald"
      />

      <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1" role="group" aria-label={t("lexiconTitle")}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              setFilter(f.key);
              setLimit(PAGE);
            }}
            aria-pressed={filter === f.key}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
              filter === f.key ? "bg-emerald text-emerald-fg" : "bg-surface-2 text-ink-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* loading */}
      {!words && !failed && (
        <div className="flex flex-col gap-2 mt-4" aria-busy="true" aria-label={t("loading")}>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-13 rounded-2xl bg-surface-2 animate-pulse" />
          ))}
        </div>
      )}

      {/* load failure with retry — a flaky fetch must never leave a blank page */}
      {failed && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <Mascot state="encourage" size={84} />
          <p className="text-ink-muted max-w-[280px]">{t("loadError")}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-2xl bg-emerald text-emerald-fg font-extrabold px-6 min-h-12"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {words && (
        <>
          <ul className="mt-3 flex flex-col gap-2">
            {filtered.slice(0, limit).map((w) => {
              const p = progress[w.id];
              const learned = isLearned(p);
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
                    <span className="flex-1 min-w-0">
                      <span className="font-bold block truncate">{w.word}</span>
                      {p && p.timesSeen > 0 && (
                        <span className="block h-1 mt-1 rounded-full bg-surface-2 overflow-hidden max-w-24">
                          <span
                            className="block h-full rounded-full bg-gold"
                            style={{ width: `${p.mastery}%` }}
                          />
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-ink-muted truncate max-w-[40%]">
                      {w.translation}
                    </span>
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

          {filtered.length === 0 && (
            <p className="text-center text-ink-muted py-10">{t("noResults")}</p>
          )}

          {filtered.length > limit && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + PAGE)}
              className="mt-4 w-full min-h-12 rounded-2xl border-2 border-line font-bold text-ink-muted active:bg-surface-2"
            >
              {t("showMore")} ({Math.min(limit, filtered.length)}/{filtered.length})
            </button>
          )}
          {filtered.length > 0 && filtered.length <= limit && (
            <p className="text-center text-xs text-ink-muted py-4">
              {filtered.length} {t("shown")}
            </p>
          )}
        </>
      )}
    </main>
  );
}
