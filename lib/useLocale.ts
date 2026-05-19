"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/types";

export const LOCALE_STORAGE_KEY = "tiger-store-locale";

declare global {
  interface Window {
    __tigerStoreLocale?: Locale;
  }
}

function isLocale(value: string | null): value is Locale {
  return value === "ar" || value === "en";
}

function readLocaleCookie(): Locale | null {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_STORAGE_KEY}=`))
    ?.split("=")[1];

  return isLocale(cookie ?? null) ? (cookie as Locale) : null;
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Cookie fallback keeps the preference usable when storage is unavailable.
  }

  document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const readLocale = () => {
      let savedLocale: string | null = null;

      const globalLocale = window.__tigerStoreLocale;

      if (globalLocale && isLocale(globalLocale)) {
        setLocaleState(globalLocale);
        return;
      }

      try {
        savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      } catch {
        savedLocale = null;
      }

      const cookieLocale = readLocaleCookie();
      const nextLocale: Locale | null = cookieLocale ?? (isLocale(savedLocale) ? savedLocale : null);

      if (nextLocale) {
        setLocaleState(nextLocale);
      }
    };

    readLocale();
    window.addEventListener("tiger-store-locale-updated", readLocale);
    window.addEventListener("storage", readLocale);

    return () => {
      window.removeEventListener("tiger-store-locale-updated", readLocale);
      window.removeEventListener("storage", readLocale);
    };
  }, []);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.__tigerStoreLocale = nextLocale;
    persistLocale(nextLocale);
    window.dispatchEvent(new Event("tiger-store-locale-updated"));
  };

  const toggleLocale = () => {
    setLocale(locale === "ar" ? "en" : "ar");
  };

  return { locale, setLocale, toggleLocale };
}
