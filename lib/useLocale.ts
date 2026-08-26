import type { Locale } from "@/lib/types";
import { useLocaleContext } from "@/components/LocaleProvider";

export const supportedLocales: Locale[] = ["ar", "en", "fr"];

export function useLocale() {
  const { locale, setLocale } = useLocaleContext();
  return { locale, setLocale, toggleLocale: () => setLocale(locale === "ar" ? "en" : "ar") };
}
