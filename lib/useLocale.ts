import type { Locale } from "@/lib/types";

export const LOCALE_STORAGE_KEY = "tiger-store-locale";

/** Customer storefront content is intentionally English-only to avoid mixed-direction layouts. */
export function useLocale(): { locale: Locale; setLocale: (nextLocale: Locale) => void; toggleLocale: () => void } {
  const locale: Locale = "en";
  return { locale, setLocale: (nextLocale: Locale) => { void nextLocale; }, toggleLocale: () => {} };
}
