"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp, useT } from "@/lib/store/app";
import { dueCount } from "@/lib/srs";

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4 3.6 6.2a1 1 0 0 0-.6.9v11.4a.6.6 0 0 0 .8.5L9 17l6 2.6 5.4-2.2a1 1 0 0 0 .6-.9V5.1a.6.6 0 0 0-.8-.5L15 6.6 9 4Z"
        fill={active ? "var(--emerald-soft)" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 4v13M15 6.6v13" stroke="currentColor" strokeWidth="1.8" strokeDasharray="0.1 3.4" strokeLinecap="round" />
    </svg>
  );
}

function ReviewIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 9a8 8 0 0 1 13.7-2.8M19.5 15a8 8 0 0 1-13.7 2.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        fill={active ? "var(--emerald-soft)" : "none"}
      />
      <path d="M18.5 2.5v4h-4M5.5 21.5v-4h4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 6.2C10.6 4.9 8.6 4.2 6 4.2c-1.1 0-2.1.13-3 .4v13.6c.9-.27 1.9-.4 3-.4 2.6 0 4.6.7 6 2 1.4-1.3 3.4-2 6-2 1.1 0 2.1.13 3 .4V4.6c-.9-.27-1.9-.4-3-.4-2.6 0-4.6.7-6 2Z"
        fill={active ? "var(--emerald-soft)" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 6.2v13.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.2" r="3.7" fill={active ? "var(--emerald-soft)" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4.8 20.2a7.6 7.6 0 0 1 14.4 0"
        fill={active ? "var(--emerald-soft)" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS = [
  { href: "/", key: "navMap", Icon: MapIcon },
  { href: "/review", key: "navReview", Icon: ReviewIcon },
  { href: "/lexicon", key: "navLexicon", Icon: BookIcon },
  { href: "/profile", key: "navProfile", Icon: ProfileIcon },
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
        {TABS.map(({ href, key, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-2 min-h-14 justify-center text-[11px] font-bold transition-colors ${
                  active ? "text-emerald" : "text-ink-muted"
                }`}
              >
                <Icon active={active} />
                {key === "navReview" && due > 0 && (
                  <span className="absolute top-1 right-[22%] min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center">
                    {due > 99 ? "99+" : due}
                  </span>
                )}
                <span>{t(key)}</span>
                {active && <span className="absolute -top-px inset-x-6 h-0.5 rounded-full bg-emerald" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
