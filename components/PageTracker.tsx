"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

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
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
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
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const utm: Record<string, string> = {};
    let hasUtm = false;
    for (const key of utmKeys) {
      const val = params.get(key);
      if (val) {
        utm[key] = val;
        hasUtm = true;
      }
    }
    if (hasUtm) {
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    }
  }, []);

  // Track page views
  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    // Don't track admin pages
    if (pathname.startsWith("/admin")) return;

    const utm = readStoredUtm();
    const sessionId = getSessionId();

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "page_view",
        page_url: pathname,
        session_id: sessionId,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
        ...utm,
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
