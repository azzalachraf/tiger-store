"use client";

import { useEffect, useState } from "react";

export type PerformanceTier = "low" | "standard" | "premium";

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

function isMetaInAppBrowser(userAgent: string) {
  return /FBAN|FBAV|FB_IAB|Instagram|Messenger|FB4A|FBIOS/i.test(userAgent);
}

function detectTier(): PerformanceTier {
  if (typeof window === "undefined") return "standard";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const navigatorInfo = window.navigator as NavigatorWithDeviceMemory;
  const cores = navigatorInfo.hardwareConcurrency ?? 4;
  const memory = navigatorInfo.deviceMemory ?? 4;
  const ua = navigatorInfo.userAgent;

  if (reducedMotion || isMetaInAppBrowser(ua) || cores <= 4 || memory <= 4) {
    return "low";
  }

  if (cores >= 8 && memory >= 8) {
    return "premium";
  }

  return "standard";
}

export function usePerformanceTier() {
  const [tier, setTier] = useState<PerformanceTier>("standard");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setTier(detectTier());

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return tier;
}
