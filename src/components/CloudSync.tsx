"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useApp } from "@/lib/store/app";
import { fullSync, pushDirty } from "@/lib/sync";

/**
 * Invisible client component mounted once in the root layout. Owns the auth
 * listener and all background sync triggers (sign-in, interval, tab hide,
 * back online).
 */
export default function CloudSync() {
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    const setUser = useApp.getState().setUser;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      setUser(user?.id ?? null, user?.email ?? null);
      if (user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        if (syncedFor.current !== user.id) {
          syncedFor.current = user.id;
          void fullSync(user.id);
        }
      }
      if (event === "SIGNED_OUT") syncedFor.current = null;
    });

    const onHide = () => {
      if (document.visibilityState === "hidden") void pushDirty();
    };
    const onOnline = () => void pushDirty();
    const interval = window.setInterval(() => void pushDirty(), 30_000);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("online", onOnline);

    return () => {
      sub.subscription.unsubscribe();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
