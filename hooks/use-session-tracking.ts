"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/services/analytics-client";
import { getCookie } from "@/utils/cookies";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { getSessionContext, recordVisitedPath } from "@/lib/session-context";

export function useSessionTracking() {
  const pathname = usePathname();
  const pageEnteredAt = useRef<number>(Date.now());
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    const sessionToken = getCookie(SESSION_COOKIE_NAME);
    if (!sessionToken) return;

    getSessionContext(sessionToken);
    recordVisitedPath(sessionToken, pathname);

    const now = Date.now();
    const timeOnPreviousPageMs = previousPath.current
      ? now - pageEnteredAt.current
      : undefined;

    trackEvent({
      type: "PAGE_VIEW",
      path: pathname,
      timeOnPageMs: timeOnPreviousPageMs,
      metadata: previousPath.current ? { previousPath: previousPath.current } : undefined,
    });

    previousPath.current = pathname;
    pageEnteredAt.current = now;

    if (pathname.startsWith("/pricing")) {
      trackEvent({ type: "PRICING_VIEWED", path: pathname });
    }
    if (pathname.startsWith("/consultation")) {
      trackEvent({ type: "CONSULTATION_VIEWED", path: pathname });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handleUnload = () => {
      const sessionToken = getCookie(SESSION_COOKIE_NAME);
      if (!sessionToken) return;
      trackEvent({
        type: "PAGE_VIEW",
        path: previousPath.current ?? pathname,
        timeOnPageMs: Date.now() - pageEnteredAt.current,
        metadata: { unload: true },
      });
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") handleUnload();
    });

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
