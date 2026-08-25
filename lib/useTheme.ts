"use client";

import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "tiger-store-theme";
const eventName = "tiger-store-theme-changed";

function preference(): ThemePreference { const stored = typeof window === "undefined" ? null : window.localStorage.getItem(THEME_STORAGE_KEY); return stored === "light" || stored === "dark" || stored === "system" ? stored : "system"; }
export function applyTheme(value: ThemePreference) { const dark = value === "dark" || (value === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches); document.documentElement.classList.toggle("dark", dark); document.documentElement.dataset.theme = value; }
export function useTheme() {
  const [theme, setValue] = useState<ThemePreference>("system");
  useEffect(() => { const update = () => { const next = preference(); setValue(next); applyTheme(next); }; update(); const media = window.matchMedia("(prefers-color-scheme: dark)"); const systemUpdate = () => { if (preference() === "system") applyTheme("system"); }; window.addEventListener(eventName, update); media.addEventListener("change", systemUpdate); return () => { window.removeEventListener(eventName, update); media.removeEventListener("change", systemUpdate); }; }, []);
  const setTheme = (next: ThemePreference) => { window.localStorage.setItem(THEME_STORAGE_KEY, next); setValue(next); applyTheme(next); window.dispatchEvent(new Event(eventName)); };
  return { theme, setTheme };
}
