"use client";

import { useEffect } from "react";
import { initPixel, trackPageView } from "@/lib/meta-pixel";
import { usePathname } from "next/navigation";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

/**
 * Initialises the Meta Pixel on mount and fires PageView on every route change.
 * Renders nothing visible.
 */
export function MetaPixelProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (PIXEL_ID) {
      initPixel(PIXEL_ID);
    }
  }, []);

  useEffect(() => {
    if (PIXEL_ID) {
      trackPageView();
    }
  }, [pathname]);

  if (!PIXEL_ID) return null;

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}
