"use client";

import { useLocale } from "@/lib/useLocale";

type LocalizedTextProps = {
  ar: string;
  en: string;
  fr?: string;
  className?: string;
};

export function LocalizedText({ ar, en, fr, className }: LocalizedTextProps) {
  const { locale } = useLocale();

  return <span className={className}>{locale === "ar" ? ar : locale === "fr" ? (fr ?? en) : en}</span>;
}
