"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/types";

export const LOCALE_STORAGE_KEY = "tiger-store-locale";
export const LOCALE_CHANGE_EVENT = "tiger-store-locale-changed";
export const supportedLocales: Locale[] = ["ar", "en", "fr"];

function browserLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
  if (saved && supportedLocales.includes(saved)) return saved;
  const preferred = navigator.language.toLowerCase();
  return preferred.startsWith("ar") ? "ar" : preferred.startsWith("fr") ? "fr" : "en";
}

export function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

export function useLocale() {
  const [locale, setValue] = useState<Locale>("en");
  useEffect(() => {
    const update = () => { const next = browserLocale(); setValue(next); applyLocale(next); };
    update();
    window.addEventListener(LOCALE_CHANGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener(LOCALE_CHANGE_EVENT, update); window.removeEventListener("storage", update); };
  }, []);
  const setLocale = (nextLocale: Locale) => { window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale); applyLocale(nextLocale); setValue(nextLocale); window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT)); };
  return { locale, setLocale, toggleLocale: () => setLocale(locale === "en" ? "ar" : "en") };
}
