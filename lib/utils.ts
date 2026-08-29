import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDisplayPrice } from "@/lib/currency";
import type { DisplayCurrency, Locale } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPriceDZD(price: number, locale: Locale = "ar", currency: DisplayCurrency = "DZD") {
  return formatDisplayPrice(price, locale, currency);
}

export function formatOrderTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Africa/Algiers",
  }).format(date);
}

export function calculateDiscount(oldPrice?: number, price?: number) {
  if (!oldPrice || !price || oldPrice <= price) {
    return null;
  }

  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
