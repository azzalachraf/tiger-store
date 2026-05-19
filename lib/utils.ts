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

export function calculateDiscount(oldPrice?: number, price?: number) {
  if (!oldPrice || !price || oldPrice <= price) {
    return null;
  }

  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
