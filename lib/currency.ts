import type { DisplayCurrency, Locale } from "@/lib/types";

export const CURRENCY_STORAGE_KEY = "tiger-store-currency";
export const DZD_PER_USD = 250;

export function isDisplayCurrency(value: string | null): value is DisplayCurrency {
  return value === "DZD" || value === "USD";
}

export function convertDzdToUsd(priceDzd: number) { return priceDzd / DZD_PER_USD; }
export function formatDzd(priceDzd: number) { return `${priceDzd.toLocaleString("en-US")} DA`; }

export function formatDisplayPrice(priceDzd: number, _locale: Locale = "en", currency: DisplayCurrency = "DZD") {
  void _locale;
  if (currency === "USD") {
    const value = convertDzdToUsd(priceDzd);
    return `$${Number.isInteger(value) ? value.toString() : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return formatDzd(priceDzd);
}
