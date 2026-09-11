"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isPublicTrackingPath, safeTrackingUrl } from "@/lib/tracking-policy";

const UTM_STORAGE_KEY = "tiger-store-utm";
const SESSION_KEY = "tiger-store-session";

/** Read UTM params from localStorage. */
export function readStoredUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(UTM_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Get or create a session ID. */
export function getTrackingSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
  } catch { return crypto.randomUUID(); }
}

/**
 * Lightweight page tracker.
 * - Captures UTM params from the URL on first visit and stores them in localStorage
 * - Sends page_view events to /api/track on every route change
 */
export function PageTracker() {
  const pathname = usePathname();
  const prevPath = useRef("");

  // Capture UTM params on mount
  useEffect(() => {
    if (typeof window === "undefined" || !isPublicTrackingPath(window.location.pathname)) return;
    const params = new URLSearchParams(window.location.search);
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const utm: Record<string, string> = {};
    let hasUtm = false;
    for (const key of utmKeys) {
      const val = params.get(key);
      if (val) {
        utm[key] = val.slice(0,160);
        hasUtm = true;
      }
    }
    if (hasUtm) {
      try { localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm)); } catch { /* Storage can be disabled in private browsers. */ }
    }
  }, []);

  // Track page views
  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    // Don't track admin pages
    if (!isPublicTrackingPath(pathname)) return;

    const utm = readStoredUtm();
    const sessionId = getTrackingSessionId();

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "page_view",
        page_url: pathname,
        session_id: sessionId,
        referrer: typeof document !== "undefined" ? safeTrackingUrl(document.referrer) : undefined,
        ...utm,
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
