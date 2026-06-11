"use client";

import { useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { getSupabase } from "@/lib/supabase/client";
import { useApp, useT } from "@/lib/store/app";
import { levelForXp, levelProgress } from "@/lib/xp";
import { pushDirty } from "@/lib/sync";
import Mascot from "@/components/Mascot";
import { ACHIEVEMENTS } from "@/lib/achievements";
import type { Lang } from "@/lib/types";

type Theme = "light" | "dark";

// Theme lives on <html data-theme> (set pre-paint by the layout bootstrap);
// expose it to React as a tiny external store.
let themeListeners: (() => void)[] = [];
function subscribeTheme(cb: () => void) {
  themeListeners.push(cb);
  return () => {
    themeListeners = themeListeners.filter((l) => l !== cb);
  };
}
function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("wq-theme", theme);
  } catch {
    // private mode — theme just won't persist
  }
  themeListeners.forEach((l) => l());
}

function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-surface-2 p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
            value === o.value ? "bg-emerald text-emerald-fg" : "text-ink-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const t = useT();
  const { stats, lang, sound, userId, userEmail, earned, setLang, setSound } = useApp();
  const [email, setEmail] = useState("");
  const [linkState, setLinkState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as Theme);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr) return;
    setLinkState("sending");
    const { error } = await getSupabase().auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setLinkState(error ? "error" : "sent");
  }

  async function signOut() {
    await pushDirty();
    await getSupabase().auth.signOut();
  }

  const level = levelForXp(stats.xp);
  const lvlPct = levelProgress(stats.xp);
  const goalPct = stats.dailyGoal > 0 ? Math.min(1, stats.todayXp / stats.dailyGoal) : 0;

  return (
    <main className="mx-auto max-w-md px-5 pt-safe pb-8 flex flex-col gap-5">
      <h1 className="font-heading text-2xl font-bold pt-4">{t("profileTitle")}</h1>

      {/* level + daily goal */}
      <section className="rounded-3xl bg-surface border border-line p-5 flex items-center gap-4">
        <Mascot state="happy" size={64} />
        <div className="flex-1">
          <p className="font-extrabold text-lg">
            {t("level")} {level}
          </p>
          <div className="mt-1.5 h-3 rounded-full bg-surface-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald"
              animate={{ width: `${Math.round(lvlPct * 100)}%` }}
            />
          </div>
          <p className="text-xs text-ink-muted font-semibold mt-1">
            {stats.xp} {t("totalXp")}
          </p>
        </div>
      </section>

      {/* stat tiles */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-accent-soft p-4">
          <p className="text-2xl font-extrabold text-accent">🔥 {stats.streak}</p>
          <p className="text-xs font-bold text-ink-muted">{t("dayStreak")}</p>
        </div>
        <div className="rounded-2xl bg-gold-soft p-4">
          <p className="text-2xl font-extrabold">🏆 {stats.longestStreak}</p>
          <p className="text-xs font-bold text-ink-muted">{t("longestStreak")}</p>
        </div>
        <div className="rounded-2xl bg-teal-soft p-4">
          <p className="text-2xl font-extrabold text-teal">💎 {stats.gems}</p>
          <p className="text-xs font-bold text-ink-muted">{t("gems")}</p>
        </div>
        <div className="rounded-2xl bg-emerald-soft p-4">
          <p className="text-2xl font-extrabold text-emerald">
            {stats.todayXp}/{stats.dailyGoal}
          </p>
          <p className="text-xs font-bold text-ink-muted">
            {t("dailyGoal")} {goalPct >= 1 ? "✅" : ""}
          </p>
        </div>
      </section>

      {/* achievements gallery */}
      <section className="rounded-3xl bg-surface border border-line p-5">
        <h2 className="font-bold text-sm mb-3">
          🏅 {t("achievements")} ({Object.keys(earned).length}/{ACHIEVEMENTS.length})
        </h2>
        <ul className="grid grid-cols-5 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const has = Boolean(earned[a.key]);
            return (
              <li
                key={a.key}
                title={`${a.title[lang]} — ${a.desc[lang]}`}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5 border ${
                  has ? "bg-gold-soft border-gold/40" : "bg-surface-2 border-line opacity-45"
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {has ? a.emoji : "🔒"}
                </span>
                <span className="sr-only">{a.title[lang]}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* cloud account */}
      <section className="rounded-3xl bg-surface border border-line p-5 flex flex-col gap-3">
        {userId ? (
          <>
            <p className="text-sm text-ink-muted">
              {t("signedInAs")} <strong className="text-ink">{userEmail}</strong>
            </p>
            <p className="text-sm font-semibold text-emerald">{t("syncOn")}</p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="self-start rounded-2xl border-2 border-line px-5 min-h-11 font-bold text-ink-muted active:bg-surface-2"
            >
              {t("signOut")}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-muted">{t("syncOff")}</p>
            {linkState === "sent" ? (
              <p className="rounded-2xl bg-emerald-soft text-emerald font-bold p-4 text-sm">
                {t("magicLinkSent")}
              </p>
            ) : (
              <form onSubmit={sendLink} className="flex flex-col gap-2.5">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  aria-label={t("emailPlaceholder")}
                  className="min-h-12 rounded-2xl border-2 border-line bg-page px-4 text-base outline-none focus:border-emerald"
                />
                <button
                  type="submit"
                  disabled={linkState === "sending"}
                  className="min-h-12 rounded-2xl bg-emerald text-emerald-fg font-extrabold disabled:opacity-60"
                >
                  {t("sendMagicLink")}
                </button>
                {linkState === "error" && (
                  <p className="text-sm font-semibold text-danger">{t("magicLinkError")}</p>
                )}
              </form>
            )}
          </>
        )}
      </section>

      {/* settings */}
      <section className="rounded-3xl bg-surface border border-line p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-sm">{t("uiLanguage")}</p>
          <Segment<Lang>
            value={lang}
            onChange={setLang}
            options={[
              { value: "bg", label: "БГ" },
              { value: "en", label: "EN" },
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-sm">{t("sound")}</p>
          <Segment<"on" | "off">
            value={sound ? "on" : "off"}
            onChange={(v) => setSound(v === "on")}
            options={[
              { value: "on", label: t("on") },
              { value: "off", label: t("off") },
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-sm">{t("theme")}</p>
          <Segment<Theme>
            value={theme}
            onChange={applyTheme}
            options={[
              { value: "light", label: t("themeLight") },
              { value: "dark", label: t("themeDark") },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
