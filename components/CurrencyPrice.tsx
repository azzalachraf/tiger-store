"use client";

import { formatDisplayPrice } from "@/lib/currency";
import { useCurrency } from "@/lib/useCurrency";
import type { Locale } from "@/lib/types";

type CurrencyPriceProps = {
  amount: number;
  locale?: Locale;
  prefix?: string;
  className?: string;
};

export function CurrencyPrice({ amount, locale = "ar", prefix = "", className }: CurrencyPriceProps) {
  const { currency } = useCurrency();

  return (
    <span className={className}>
      {prefix}
      {formatDisplayPrice(amount, locale, currency)}
    </span>
  );
}
