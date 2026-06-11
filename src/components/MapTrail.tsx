"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Journey } from "@/lib/types";
import { currentLessonIndex, flattenLessons, loadJourney, type LessonRef } from "@/lib/data";
import { useApp, useT } from "@/lib/store/app";
import { levelForXp } from "@/lib/xp";
import Mascot from "@/components/Mascot";

const REGION_GRADIENTS = [
  "linear-gradient(135deg, var(--emerald-soft), var(--gold-soft))",
  "linear-gradient(135deg, var(--gold-soft), var(--accent-soft))",
  "linear-gradient(135deg, var(--teal-soft), var(--emerald-soft))",
  "linear-gradient(135deg, var(--accent-soft), var(--teal-soft))",
  "linear-gradient(135deg, var(--gold-soft), var(--teal-soft))",
  "linear-gradient(135deg, var(--emerald-soft), var(--accent-soft))",
];

function DailyRing({ pct, size = 38 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth="5" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--gold)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, pct))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function StatsBar() {
  const t = useT();
  const stats = useApp((s) => s.stats);
  const goalPct = stats.dailyGoal > 0 ? stats.todayXp / stats.dailyGoal : 0;
  return (
    <header className="sticky top-0 z-30 bg-page/90 backdrop-blur border-b border-line pt-safe">
      <div className="mx-auto max-w-md px-5 py-2.5 flex items-center gap-3">
        <span className="text-xl" aria-hidden>✨</span>
        <p className="font-heading font-bold flex-1 truncate">{t("yourJourney")}</p>
        <span className="text-sm font-extrabold" title={t("dayStreak")}>
          🔥 {stats.streak}
        </span>
        <span className="text-sm font-extrabold" title={t("gems")}>
          💎 {stats.gems}
        </span>
        <span className="text-sm font-extrabold text-emerald" title={t("level")}>
          ⬆ {levelForXp(stats.xp)}
        </span>
        <div title={t("dailyGoal")}>
          <DailyRing pct={goalPct} />
        </div>
      </div>
    </header>
  );
}

function LessonNode({
  refr,
  state,
  isCurrent,
  anchorRef,
}: {
  refr: LessonRef;
  state: "done" | "current" | "locked";
  isCurrent: boolean;
  anchorRef: ((el: HTMLDivElement | null) => void) | undefined;
}) {
  const t = useT();
  const reduced = useReducedMotion();
  const x = Math.sin(refr.globalIndex * 0.9) * 30; // -30%..30% offset from center
  const label = `${t("lesson")} ${refr.lesson.index + 1}`;

  const inner =
    state === "done" ? (
      <span className="text-2xl" aria-hidden>✓</span>
    ) : state === "locked" ? (
      <span className="text-xl opacity-70" aria-hidden>🔒</span>
    ) : (
      <span className="text-2xl" aria-hidden>★</span>
    );

  const circle = (
    <div
      className={`relative w-16 h-16 rounded-full flex items-center justify-center font-extrabold border-b-4 transition-transform active:scale-95 ${
        state === "done"
          ? "bg-gold text-ink border-[#a8851d]"
          : state === "current"
            ? "bg-emerald text-emerald-fg border-[#155c45]"
            : "bg-surface-2 text-ink-muted border-line"
      }`}
    >
      {isCurrent && !reduced && (
        <motion.span
          className="absolute inset-[-7px] rounded-full border-[3px] border-emerald"
          animate={{ scale: [1, 1.18, 1], opacity: [0.9, 0.25, 0.9] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
      )}
      {inner}
    </div>
  );

  return (
    <div className="relative h-24" ref={anchorRef}>
      <div className="absolute -translate-x-1/2" style={{ left: `calc(50% + ${x}%)` }}>
        {state === "locked" ? (
          <div aria-label={`${label} — ${t("locked")}`}>{circle}</div>
        ) : (
          <Link
            href={`/lesson/${refr.lesson.id}`}
            aria-label={`${label}${state === "done" ? ` — ${t("done")}` : ""}`}
          >
            {circle}
          </Link>
        )}
      </div>
    </div>
  );
}

const CHEST_GEMS = 25;

function ChestModal({ regionTitle, onClaim }: { regionTitle: string; onClaim: () => void }) {
  const t = useT();
  const [opened, setOpened] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center px-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-3xl bg-surface p-6 w-full max-w-sm flex flex-col items-center gap-4 text-center"
      >
        <Mascot state="celebrate" size={80} />
        <h2 className="font-heading text-2xl font-bold">{t("chestTitle")}</h2>
        <p className="text-sm text-ink-muted">
          {regionTitle} · {t("chestBody")}
        </p>
        <motion.span
          className="text-6xl"
          animate={opened ? { rotate: [0, -6, 6, 0], scale: [1, 1.25, 1.1] } : { y: [0, -4, 0] }}
          transition={opened ? { duration: 0.5 } : { duration: 1.4, repeat: Infinity }}
          aria-hidden
        >
          {opened ? "💎" : "🎁"}
        </motion.span>
        {opened && <p className="font-extrabold text-teal text-lg">+{CHEST_GEMS} 💎</p>}
        <button
          type="button"
          onClick={() => {
            if (!opened) setOpened(true);
            else onClaim();
          }}
          className="w-full min-h-13 rounded-2xl bg-gold text-ink font-extrabold shadow-[0_4px_0_0_rgba(0,0,0,0.18)] active:translate-y-0.5 active:shadow-none transition-all"
        >
          {opened ? t("chestClaim") : t("chestOpen")}
        </button>
      </motion.div>
    </div>
  );
}

export default function MapTrail() {
  const t = useT();
  const [journey, setJourney] = useState<Journey | null>(null);
  const completed = useApp((s) => s.completedLessons);
  const chestsOpened = useApp((s) => s.chestsOpened);
  const openChest = useApp((s) => s.openChest);
  const hydrated = useApp((s) => s.hydrated);
  const [chestFor, setChestFor] = useState<string | null>(null);
  const currentAnchor = useRef<HTMLDivElement | null>(null);
  const scrolled = useRef(false);

  useEffect(() => {
    void loadJourney().then(setJourney);
  }, []);

  useEffect(() => {
    if (journey && hydrated && currentAnchor.current && !scrolled.current) {
      scrolled.current = true;
      currentAnchor.current.scrollIntoView({ block: "center" });
    }
  }, [journey, hydrated]);

  if (!journey || !hydrated) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Mascot state="idle" size={80} />
      </div>
    );
  }

  const refs = flattenLessons(journey);
  const currentIdx = currentLessonIndex(refs, completed);

  return (
    <div className="min-h-dvh">
      <StatsBar />
      <main className="mx-auto max-w-md px-5 pb-28">
        {journey.regions.map((region) => {
          const regionRefs = refs.filter((r) => r.region.index === region.index);
          const doneInRegion = regionRefs.filter((r) => completed[r.lesson.id]).length;
          const regionDone = doneInRegion === region.lessons.length;
          const chestReady = regionDone && !chestsOpened[region.slug];
          return (
            <section key={region.slug} aria-label={region.titleBg}>
              {/* region banner */}
              <div
                className="mt-6 rounded-3xl border border-line p-4 flex items-center gap-3"
                style={{ backgroundImage: REGION_GRADIENTS[region.index % REGION_GRADIENTS.length] }}
              >
                <span className="text-3xl" aria-hidden>
                  {region.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-heading text-lg font-bold leading-tight">{region.titleBg}</h2>
                  <p className="text-xs text-ink-muted font-semibold mt-0.5">
                    {region.book === 0
                      ? t("prologueBook")
                      : `${region.book === 1 ? t("bookOne") : t("bookTwo")} · ${t("chapter")} ${region.book === 1 ? region.index : region.index - 12}`}
                    {" · "}
                    {t("pages")} {region.startPage}–{region.endPage}
                  </p>
                </div>
                <span className="rounded-full bg-surface/80 border border-line px-3 py-1 text-xs font-extrabold">
                  {doneInRegion}/{region.lessons.length}
                </span>
              </div>

              {/* winding trail of lesson nodes */}
              <div className="py-3">
                {regionRefs.map((r) => {
                  const state = completed[r.lesson.id]
                    ? "done"
                    : r.globalIndex === currentIdx
                      ? "current"
                      : "locked";
                  return (
                    <LessonNode
                      key={r.lesson.id}
                      refr={r}
                      state={state}
                      isCurrent={r.globalIndex === currentIdx}
                      anchorRef={
                        r.globalIndex === currentIdx
                          ? (el) => {
                              currentAnchor.current = el;
                            }
                          : undefined
                      }
                    />
                  );
                })}
                {chestReady && (
                  <div className="flex justify-center py-2">
                    <motion.button
                      type="button"
                      onClick={() => setChestFor(region.slug)}
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="text-5xl drop-shadow"
                      aria-label={`${t("chestTitle")} — ${region.titleBg}`}
                    >
                      🎁
                    </motion.button>
                  </div>
                )}
              </div>
            </section>
          );
        })}
        {chestFor && (
          <ChestModal
            regionTitle={journey.regions.find((r) => r.slug === chestFor)?.titleBg ?? ""}
            onClaim={() => {
              openChest(chestFor, CHEST_GEMS);
              setChestFor(null);
            }}
          />
        )}
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Mascot state="happy" size={72} />
          <p className="text-sm text-ink-muted max-w-[260px]">{t("mascotIntro")}</p>
        </div>
      </main>
    </div>
  );
}
