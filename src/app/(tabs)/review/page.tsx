"use client";

import Mascot from "@/components/Mascot";
import { dueCount } from "@/lib/srs";
import { useApp, useT } from "@/lib/store/app";

export default function ReviewPage() {
  const t = useT();
  const due = useApp((s) => dueCount(Object.values(s.progress)));

  return (
    <main className="mx-auto max-w-md px-5 pt-safe pb-8 min-h-dvh flex flex-col">
      <h1 className="font-heading text-2xl font-bold py-4">{t("reviewTitle")}</h1>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
        <Mascot state="encourage" size={96} />
        {due > 0 && (
          <p className="rounded-full bg-accent-soft text-accent font-extrabold px-4 py-2">
            {due} {t("dueToday")}
          </p>
        )}
        <p className="text-ink-muted max-w-[280px]">{t("reviewComingSoon")}</p>
      </div>
    </main>
  );
}
