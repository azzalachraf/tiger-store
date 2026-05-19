"use client";

import { useLocale } from "@/lib/useLocale";

type LocalizedTextProps = {
  ar: string;
  en: string;
  className?: string;
};

export function LocalizedText({ ar, en, className }: LocalizedTextProps) {
  const { locale } = useLocale();

  return <span className={className}>{locale === "ar" ? ar : en}</span>;
}
