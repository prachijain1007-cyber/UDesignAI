"use client";

import { getCookie } from "@/utils/cookies";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import type { TrackEventPayload } from "@/types/session";

function getUtmParams() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
  };
}

export function trackEvent(payload: TrackEventPayload) {
  const sessionToken = getCookie(SESSION_COOKIE_NAME);
  if (!sessionToken) return;

  const body = JSON.stringify({
    sessionToken,
    referrer: typeof document !== "undefined" ? document.referrer : undefined,
    ...getUtmParams(),
    ...payload,
  });

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/events", blob);
      return;
    }
  } catch {
    // fall through to fetch
  }

  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
