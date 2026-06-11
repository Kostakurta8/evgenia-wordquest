"use client";

import { useState } from "react";
import Link from "next/link";
import Mascot from "@/components/Mascot";
import ReviewPlayer from "@/components/review/ReviewPlayer";
import { dueCount } from "@/lib/srs";
import { useApp, useT } from "@/lib/store/app";

export default function ReviewPage() {
  const t = useT();
  const due = useApp((s) => dueCount(Object.values(s.progress)));
  const learned = useApp(
    (s) =>
      Object.values(s.progress).filter((p) => p.timesSeen > 0 || p.status !== "new").length,
  );
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return <ReviewPlayer onExit={() => setPlaying(false)} />;
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-safe pb-8 min-h-dvh flex flex-col">
      <h1 className="font-heading text-2xl font-bold py-4">{t("reviewTitle")}</h1>
      <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
        <Mascot state={due > 0 ? "encourage" : "happy"} size={96} />
        {due > 0 ? (
          <>
            <p className="rounded-full bg-accent-soft text-accent font-extrabold px-5 py-2 text-lg">
              {due} {t("dueToday")}
            </p>
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="w-full max-w-sm min-h-14 rounded-2xl bg-emerald text-emerald-fg text-lg font-extrabold shadow-[0_4px_0_0_rgba(0,0,0,0.18)] active:translate-y-0.5 active:shadow-none transition-all"
            >
              {t("reviewNow")} 🔁
            </button>
          </>
        ) : (
          <p className="text-ink-muted max-w-[280px]">{t("reviewEmpty")}</p>
        )}

        {learned >= 10 && (
          <Link
            href="/challenge"
            className="w-full max-w-sm min-h-13 rounded-2xl border-2 border-gold bg-gold-soft font-extrabold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
          >
            ⚔️ {t("challenge")}
          </Link>
        )}
      </div>
    </main>
  );
}
