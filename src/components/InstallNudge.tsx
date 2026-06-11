"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/store/app";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "wq-install-dismissed";

/**
 * "Add to Home Screen" nudge. Android/Chromium: native install prompt via
 * beforeinstallprompt. iOS has no API — Safari users use Share → Add to
 * Home Screen, so we stay silent there.
 */
export default function InstallNudge() {
  const t = useT();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      try {
        if (localStorage.getItem(DISMISS_KEY)) return;
      } catch {
        // ignore
      }
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred) return null;

  return (
    <div className="fixed bottom-24 inset-x-4 z-40 mx-auto max-w-md">
      <div className="rounded-2xl bg-surface border border-line shadow-lg p-3.5 flex items-center gap-3">
        <span className="text-2xl" aria-hidden>
          ✨
        </span>
        <p className="flex-1 text-sm font-semibold">{t("installNudge")}</p>
        <button
          type="button"
          onClick={() => {
            void deferred.prompt();
            setDeferred(null);
          }}
          className="rounded-xl bg-emerald text-emerald-fg font-bold px-3.5 py-2 text-sm"
        >
          {t("installYes")}
        </button>
        <button
          type="button"
          aria-label={t("off")}
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // ignore
            }
            setDeferred(null);
          }}
          className="text-ink-muted font-bold px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
