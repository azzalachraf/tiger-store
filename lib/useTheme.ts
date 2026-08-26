"use client";

import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark";
export const THEME_STORAGE_KEY = "tiger-store-theme";
const eventName = "tiger-store-theme-changed";

function preference(): ThemePreference | null { const stored = typeof window === "undefined" ? null : window.localStorage.getItem(THEME_STORAGE_KEY); return stored === "light" || stored === "dark" ? stored : null; }
export function applyTheme(value: ThemePreference | null) { const dark = value === "dark" || (value === null && window.matchMedia("(prefers-color-scheme: dark)").matches); document.documentElement.classList.toggle("dark", dark); document.documentElement.dataset.theme = dark ? "dark" : "light"; }
export function useTheme() {
  const [theme, setValue] = useState<ThemePreference>("light");
  useEffect(() => { const update = () => { const stored = preference(); const next = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); setValue(next); applyTheme(stored); }; update(); const media = window.matchMedia("(prefers-color-scheme: dark)"); const systemUpdate = () => { if (preference() === null) update(); }; window.addEventListener(eventName, update); media.addEventListener("change", systemUpdate); return () => { window.removeEventListener(eventName, update); media.removeEventListener("change", systemUpdate); }; }, []);
  const setTheme = (next: ThemePreference) => { window.localStorage.setItem(THEME_STORAGE_KEY, next); setValue(next); applyTheme(next); window.dispatchEvent(new Event(eventName)); };
  return { theme, setTheme };
}
