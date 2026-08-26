"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/types";

const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void } | null>(null);
const COOKIE_NAME = "tiger-store-locale";

export function LocaleProvider({ locale: initialLocale, children }: { locale: Locale; children: ReactNode }) {
  const [locale, setValue] = useState(initialLocale);
  const router = useRouter();
  const value = useMemo(() => ({
    locale,
    setLocale(next: Locale) {
      document.cookie = `${COOKIE_NAME}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      setValue(next);
      router.refresh();
    },
  }), [locale, router]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used within LocaleProvider");
  return value;
}
