"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

/**
 * When Canvas is configured, periodically sync in the background so new
 * instructor assignments appear without a manual refresh (same cadence as server cron).
 */
export function useCanvasAutoSync() {
  const { status } = useSession();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          hasCanvasToken?: boolean;
          canvasBaseUrl?: string;
        };
        if (!data.hasCanvasToken || !data.canvasBaseUrl?.trim()) {
          return;
        }
        await fetch("/api/canvas/sync", { method: "POST" });
      } catch {
        /* ignore */
      }
    }

    void tick();
    timerRef.current = setInterval(() => {
      void tick();
    }, FOUR_HOURS_MS);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);
}
