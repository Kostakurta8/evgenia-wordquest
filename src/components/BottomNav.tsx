"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp, useT } from "@/lib/store/app";
import { dueCount } from "@/lib/srs";

const TABS = [
  { href: "/", key: "navMap", icon: "🗺️" },
  { href: "/review", key: "navReview", icon: "🔁" },
  { href: "/lexicon", key: "navLexicon", icon: "📖" },
  { href: "/profile", key: "navProfile", icon: "👤" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  const due = useApp((s) => dueCount(Object.values(s.progress)));

  return (
    <nav
      aria-label={t("appName")}
      className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line pb-safe"
    >
      <ul className="mx-auto max-w-md grid grid-cols-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2 min-h-14 justify-center text-xs font-bold transition-colors ${
                  active ? "text-emerald" : "text-ink-muted"
                }`}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {tab.icon}
                </span>
                {tab.key === "navReview" && due > 0 && (
                  <span className="absolute top-1 right-[22%] min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center">
                    {due > 99 ? "99+" : due}
                  </span>
                )}
                <span>{t(tab.key)}</span>
                {active && <span className="absolute -top-px inset-x-6 h-0.5 rounded-full bg-emerald" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
