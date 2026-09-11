"use client";

import { useEffect, useRef, useState } from "react";
import { initPixel, trackPageView } from "@/lib/meta-pixel";
import { usePathname } from "next/navigation";

import { isPublicTrackingPath } from "@/lib/tracking-policy";

/**
 * Initialises the Meta Pixel on mount and fires PageView on every route change.
 * Renders nothing visible.
 */
export function MetaPixelProvider() {
  const pathname = usePathname();
  const [pixelId, setPixelId] = useState("");
  const privateVisit = useRef(false);
  const allowed = isPublicTrackingPath(pathname);

  useEffect(() => {
    if (!allowed) {
      privateVisit.current = true;
      window.fbq?.("consent", "revoke");
      if (window.fbq?.queue) window.fbq.queue.length = 0;
      return;
    }
    if (document.referrer) {
      try { const referrer = new URL(document.referrer); if (referrer.origin === location.origin && !isPublicTrackingPath(referrer.pathname)) privateVisit.current = true; } catch { /* No valid referrer. */ }
    }
    if (privateVisit.current) return;
    let active = true;
    fetch("/api/marketing/public").then(r => r.json()).then((value: { pixelId?: string }) => {
      if (active) {
        const id = typeof value.pixelId === "string" && /^\d+$/.test(value.pixelId) ? value.pixelId : "";
        setPixelId(id);
        if (!id) window.fbq?.("consent", "revoke");
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [allowed]);

  useEffect(() => {
    if (allowed && pixelId && !privateVisit.current) {
      initPixel(pixelId);
      window.fbq?.("consent", "grant");
      trackPageView();
    }
  }, [pathname, allowed, pixelId]);

  if (!allowed || !pixelId) return null;

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
