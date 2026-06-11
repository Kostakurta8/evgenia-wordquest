import fs from "node:fs";
import path from "node:path";
import { t } from "@/lib/i18n";
import type { Word } from "@/lib/types";

/**
 * P1 placeholder home: proves the enriched dataset loads, Cyrillic fonts
 * render, and theme tokens work on a real card. Replaced by the map in P2.
 */

function loadWords(): Word[] | null {
  const file = path.join(process.cwd(), "data", "words.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Word[];
}

function BookSentence({ sentence }: { sentence: string }) {
  const parts = sentence.split("**");
  return (
    <p className="text-sm leading-relaxed">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="text-emerald font-bold">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

function WordCard({ word }: { word: Word }) {
  return (
    <article className="rounded-2xl bg-surface border border-line p-5 shadow-sm">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h3 className="font-heading text-2xl font-semibold">{word.word}</h3>
        <span className="text-ink-muted text-sm">{word.ipa}</span>
      </div>
      <p className="mt-2 text-base leading-relaxed">{word.explanationBg}</p>
      <p className="mt-1 text-sm text-ink-muted italic">{word.exampleEn}</p>
      {word.bookSentenceEn && (
        <div className="mt-3 rounded-xl bg-gold-soft border border-gold/40 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-1">
            {t("fromBook")} {word.bookSentenceRef}
          </p>
          <BookSentence sentence={word.bookSentenceEn} />
        </div>
      )}
      <div className="mt-3 rounded-xl bg-teal-soft p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-1">
          {t("mnemonic")}
        </p>
        <p className="text-sm">{word.mnemonicBg}</p>
      </div>
    </article>
  );
}

export default function Home() {
  const words = loadWords();
  const withSentence = words?.filter((w) => w.bookSentenceEn).length ?? 0;

  return (
    <main className="mx-auto w-full max-w-md px-5 py-10 pb-safe flex flex-col gap-6">
      <header className="text-center">
        <p className="text-4xl" aria-hidden>
          ✨
        </p>
        <h1 className="font-heading text-3xl font-bold mt-2">{t("appName")}</h1>
        <p className="mt-2 text-ink-muted">{t("tagline")}</p>
      </header>

      {words ? (
        <>
          <div className="flex justify-center gap-3 text-sm font-semibold">
            <span className="rounded-full bg-emerald-soft text-emerald px-4 py-2">
              {words.length} {t("wordsLoaded")}
            </span>
            <span className="rounded-full bg-gold-soft px-4 py-2">
              {withSentence} {t("withBookSentence")}
            </span>
          </div>
          <section className="flex flex-col gap-4">
            {[words[0], words[420], words[1100]]
              .filter((w): w is Word => Boolean(w))
              .map((w) => (
                <WordCard key={w.id} word={w} />
              ))}
          </section>
        </>
      ) : (
        <p className="text-center text-ink-muted">
          data/words.json липсва — изпълни <code>npm run enrich</code>.
        </p>
      )}
    </main>
  );
}
