"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Journey, Region, Word } from "@/lib/types";
import {
  currentLessonIndex,
  flattenLessons,
  loadJourney,
  loadWordMap,
  type LessonRef,
} from "@/lib/data";
import { useApp, useT } from "@/lib/store/app";
import { levelForXp } from "@/lib/xp";
import { RECAPS } from "@/lib/recaps";
import Mascot from "@/components/Mascot";
import RegionScene from "@/components/RegionScene";

const NODE_GAP = 92;
const CHEST_GEMS = 25;

const nodeX = (globalIdx: number) => 50 + Math.sin(globalIdx * 0.9) * 30; // % from left

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
        <span className="text-sm font-extrabold" title={t("dayStreak")}>🔥 {stats.streak}</span>
        <span className="text-sm font-extrabold" title={t("gems")}>💎 {stats.gems}</span>
        <span className="text-sm font-extrabold text-emerald" title={t("level")}>⬆ {levelForXp(stats.xp)}</span>
        <div title={t("dailyGoal")}>
          <DailyRing pct={goalPct} />
        </div>
      </div>
    </header>
  );
}

/** Ambient drifting fireflies over the map. */
function Fireflies() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  const flies = [
    { left: "12%", top: "22%", d: 7.5 },
    { left: "78%", top: "16%", d: 9 },
    { left: "32%", top: "44%", d: 8 },
    { left: "88%", top: "55%", d: 7 },
    { left: "8%", top: "68%", d: 9.5 },
    { left: "62%", top: "78%", d: 8.5 },
    { left: "45%", top: "30%", d: 10 },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 z-20" aria-hidden>
      {flies.map((f, i) => (
        <motion.span
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-[#FFE9A3] shadow-[0_0_8px_3px_rgba(255,211,77,0.55)]"
          style={{ left: f.left, top: f.top }}
          animate={{
            y: [0, -22, 4, -10, 0],
            x: [0, 10, -8, 6, 0],
            opacity: [0.2, 0.95, 0.4, 0.85, 0.2],
          }}
          transition={{ duration: f.d, repeat: Infinity, ease: "easeInOut", delay: i * 0.9 }}
        />
      ))}
    </div>
  );
}

/** Smooth S-curve trail through the region's node points. */
function TrailPath({
  regionRefs,
  completedCount,
}: {
  regionRefs: LessonRef[];
  completedCount: number;
}) {
  if (regionRefs.length < 2) return null;
  const pts = regionRefs.map((r, i) => ({
    x: nodeX(r.globalIndex),
    y: i * NODE_GAP + NODE_GAP / 2,
  }));
  const d = (upTo: number) => {
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i <= upTo; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      path += ` C ${a.x} ${a.y + NODE_GAP / 2}, ${b.x} ${b.y - NODE_GAP / 2}, ${b.x} ${b.y}`;
    }
    return path;
  };
  const h = regionRefs.length * NODE_GAP;
  return (
    <svg
      className="absolute inset-0 w-full"
      style={{ height: h }}
      viewBox={`0 0 100 ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={d(pts.length - 1)}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="0.5 14"
        opacity="0.55"
        vectorEffect="non-scaling-stroke"
      />
      {completedCount >= 2 && (
        <path
          d={d(Math.min(completedCount - 1, pts.length - 1))}
          fill="none"
          stroke="var(--emerald)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.75"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

function LessonNode({
  refr,
  state,
  anchorRef,
}: {
  refr: LessonRef;
  state: "done" | "current" | "locked";
  anchorRef?: (el: HTMLDivElement | null) => void;
}) {
  const t = useT();
  const reduced = useReducedMotion();
  const x = nodeX(refr.globalIndex);
  const label = `${t("lesson")} ${refr.lesson.index + 1}`;
  const mascotSide = x > 50 ? "right" : "left";

  const circle = (
    <div
      className={`relative w-16 h-16 rounded-full flex items-center justify-center font-extrabold border-b-4 transition-transform active:scale-95 ${
        state === "done"
          ? "bg-gold text-ink border-[#a8851d] shadow-[0_3px_10px_rgba(201,162,39,0.4)]"
          : state === "current"
            ? "bg-emerald text-emerald-fg border-[#155c45] shadow-[0_3px_14px_rgba(31,122,92,0.5)]"
            : "bg-surface-2 text-ink-muted border-line"
      }`}
    >
      {state === "current" && !reduced && (
        <motion.span
          className="absolute inset-[-7px] rounded-full border-[3px] border-emerald"
          animate={{ scale: [1, 1.18, 1], opacity: [0.9, 0.25, 0.9] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
      )}
      <span className={state === "locked" ? "text-xl opacity-70" : "text-2xl"} aria-hidden>
        {state === "done" ? "✓" : state === "locked" ? "🔒" : "★"}
      </span>
    </div>
  );

  return (
    <div className="relative" style={{ height: NODE_GAP }} ref={anchorRef}>
      <div
        className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2"
        style={{ left: `${x}%` }}
      >
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
      {state === "current" && (
        <div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
          style={
            mascotSide === "left"
              ? { left: `calc(${x}% + 44px)` }
              : { left: `calc(${x}% - 96px)` }
          }
          aria-hidden
        >
          <Mascot state="idle" size={52} />
        </div>
      )}
    </div>
  );
}

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
          onClick={() => (opened ? onClaim() : setOpened(true))}
          className="w-full min-h-13 rounded-2xl bg-gold text-ink font-extrabold shadow-[0_4px_0_0_rgba(0,0,0,0.18)] active:translate-y-0.5 active:shadow-none transition-all"
        >
          {opened ? t("chestClaim") : t("chestOpen")}
        </button>
      </motion.div>
    </div>
  );
}

/** Bottom sheet: chapter recap + the chapter's words. */
function RegionSheet({
  region,
  started,
  onClose,
}: {
  region: Region;
  started: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const progress = useApp((s) => s.progress);
  const [words, setWords] = useState<Word[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadWordMap()
      .then((m) => {
        if (!alive) return;
        setWords(
          region.lessons
            .flatMap((l) => l.wordIds)
            .map((id) => m.get(id))
            .filter((w): w is Word => Boolean(w)),
        );
      })
      .catch(() => setWords([]));
    return () => {
      alive = false;
    };
  }, [region]);

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-end justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: 80, opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="w-full max-w-md bg-surface rounded-t-3xl max-h-[86dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-28 overflow-hidden rounded-t-3xl relative">
          <RegionScene slug={region.slug} className="w-full h-full" />
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/35 text-white font-bold backdrop-blur"
          >
            ✕
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4 pb-safe">
          <div>
            <h2 className="font-heading text-2xl font-bold">
              {region.emoji} {region.titleBg}
            </h2>
            <p className="text-xs text-ink-muted font-semibold mt-1">
              {region.book === 0
                ? t("prologueBook")
                : `${region.book === 1 ? t("bookOne") : t("bookTwo")} · ${t("chapter")} ${region.book === 1 ? region.index : region.index - 12}`}
              {" · "}
              {t("pages")} {region.startPage}–{region.endPage} · {region.wordCount} {t("words")}
            </p>
          </div>

          <div className="rounded-2xl bg-gold-soft border border-gold/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-1.5">
              📖 {t("recapTitle")}
            </p>
            {started ? (
              <p className="text-[15px] leading-relaxed">{RECAPS[region.slug]}</p>
            ) : (
              <p className="text-sm text-ink-muted italic">🔒 {t("recapLocked")}</p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-muted mb-2">
              {t("wordsInChapter")}
            </p>
            {!words ? (
              <div className="flex flex-col gap-1.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="h-9 rounded-xl bg-surface-2 animate-pulse" />
                ))}
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {words.map((w) => {
                  const p = progress[w.id];
                  const learned = Boolean(p && (p.timesSeen > 0 || p.status !== "new"));
                  return (
                    <li
                      key={w.id}
                      className="flex items-center gap-2.5 rounded-xl bg-surface-2/60 px-3 py-2"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${learned ? "bg-emerald" : "bg-line"}`}
                      />
                      <span className="font-bold text-sm flex-1 truncate">{w.word}</span>
                      <span className="text-xs text-ink-muted truncate max-w-[45%]">
                        {w.translation}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function MapTrail() {
  const t = useT();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [failed, setFailed] = useState(false);
  const completed = useApp((s) => s.completedLessons);
  const chestsOpened = useApp((s) => s.chestsOpened);
  const openChest = useApp((s) => s.openChest);
  const hydrated = useApp((s) => s.hydrated);
  const [chestFor, setChestFor] = useState<string | null>(null);
  const [sheetFor, setSheetFor] = useState<Region | null>(null);
  const currentAnchor = useRef<HTMLDivElement | null>(null);
  const scrolled = useRef(false);

  function load() {
    loadJourney()
      .then(setJourney)
      .catch(() => setFailed(true));
  }
  useEffect(load, []);

  useEffect(() => {
    if (journey && hydrated && currentAnchor.current && !scrolled.current) {
      scrolled.current = true;
      currentAnchor.current.scrollIntoView({ block: "center" });
    }
  }, [journey, hydrated]);

  if (failed) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Mascot state="encourage" size={84} />
        <p className="text-ink-muted max-w-[280px]">{t("loadError")}</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            load();
          }}
          className="rounded-2xl bg-emerald text-emerald-fg font-extrabold px-6 min-h-12"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

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
    <div className="min-h-dvh relative">
      <div className="absolute inset-0 texture-parchment opacity-[0.06] pointer-events-none" aria-hidden />
      <StatsBar />
      <Fireflies />
      <main className="relative mx-auto max-w-md px-5 pb-28">
        {journey.regions.map((region) => {
          const regionRefs = refs.filter((r) => r.region.index === region.index);
          const doneInRegion = regionRefs.filter((r) => completed[r.lesson.id]).length;
          const regionDone = doneInRegion === region.lessons.length;
          const chestReady = regionDone && !chestsOpened[region.slug];
          return (
            <section key={region.slug} aria-label={region.titleBg}>
              {/* region card: scene header + info row */}
              <button
                type="button"
                onClick={() => setSheetFor(region)}
                className="mt-6 w-full rounded-3xl border border-line overflow-hidden bg-surface text-left shadow-sm active:scale-[0.99] transition-transform"
              >
                <div className="h-20 relative">
                  <RegionScene slug={region.slug} className="w-full h-full" />
                  <span className="absolute bottom-2 right-3 rounded-full bg-black/30 text-white backdrop-blur px-2.5 py-0.5 text-xs font-extrabold">
                    {doneInRegion}/{region.lessons.length}
                  </span>
                </div>
                <div className="px-4 py-2.5 flex items-center gap-2.5">
                  <span className="text-xl" aria-hidden>{region.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-heading text-base font-bold leading-tight truncate">
                      {region.titleBg}
                    </h2>
                    <p className="text-[11px] text-ink-muted font-semibold">
                      {region.book === 0
                        ? t("prologueBook")
                        : `${region.book === 1 ? t("bookOne") : t("bookTwo")} · ${t("chapter")} ${region.book === 1 ? region.index : region.index - 12}`}
                      {" · "}
                      {t("pages")} {region.startPage}–{region.endPage}
                    </p>
                  </div>
                  <span className="text-ink-muted text-lg" aria-hidden>📖</span>
                </div>
              </button>

              {/* winding trail */}
              <div className="relative py-3">
                <div className="relative">
                  <TrailPath regionRefs={regionRefs} completedCount={doneInRegion} />
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
                </div>
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
        {sheetFor && (
          <RegionSheet
            region={sheetFor}
            started={sheetFor.lessons.some((l) => completed[l.id])}
            onClose={() => setSheetFor(null)}
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
