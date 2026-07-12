"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { usePerformanceTier } from "@/lib/usePerformanceTier";

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const tier = usePerformanceTier();
  const pathname = usePathname();
  const hydrated = useRef(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.performanceTier = tier;
    document.documentElement.dataset.motion = tier === "low" ? "reduced" : "enhanced";
  }, [tier]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }

    setTransitioning(true);
    const timer = window.setTimeout(() => setTransitioning(false), tier === "premium" ? 420 : 260);
    return () => window.clearTimeout(timer);
  }, [pathname, tier]);

  return (
    <>
      <div
        aria-hidden="true"
        className={`route-progress ${transitioning ? "route-progress-active" : ""}`}
      />
      {children}
    </>
  );
}
