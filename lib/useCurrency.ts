"use client";

import { useEffect, useState } from "react";
import { CURRENCY_STORAGE_KEY, isDisplayCurrency } from "@/lib/currency";
import type { DisplayCurrency } from "@/lib/types";

declare global {
  interface Window {
    __tigerStoreCurrency?: DisplayCurrency;
  }
}

function readCurrencyCookie(): DisplayCurrency | null {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CURRENCY_STORAGE_KEY}=`))
    ?.split("=")[1];

  return isDisplayCurrency(cookie ?? null) ? (cookie as DisplayCurrency) : null;
}

function persistCurrency(currency: DisplayCurrency) {
  try {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  } catch {
    // Cookie fallback keeps the preference usable if storage is unavailable.
  }

  document.cookie = `${CURRENCY_STORAGE_KEY}=${currency}; path=/; max-age=31536000; samesite=lax`;
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState<DisplayCurrency>("DZD");

  useEffect(() => {
    const readCurrency = () => {
      let savedCurrency: string | null = null;

      const globalCurrency = window.__tigerStoreCurrency;

      if (globalCurrency && isDisplayCurrency(globalCurrency)) {
        setCurrencyState(globalCurrency);
        return;
      }

      try {
        savedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
      } catch {
        savedCurrency = null;
      }

      const cookieCurrency = readCurrencyCookie();
      const nextCurrency: DisplayCurrency | null = cookieCurrency ?? (isDisplayCurrency(savedCurrency) ? savedCurrency : null);

      if (nextCurrency) {
        setCurrencyState(nextCurrency);
      }
    };

    readCurrency();
    window.addEventListener("tiger-store-currency-updated", readCurrency);
    window.addEventListener("storage", readCurrency);

    return () => {
      window.removeEventListener("tiger-store-currency-updated", readCurrency);
      window.removeEventListener("storage", readCurrency);
    };
  }, []);

  const setCurrency = (nextCurrency: DisplayCurrency) => {
    setCurrencyState(nextCurrency);
    window.__tigerStoreCurrency = nextCurrency;
    persistCurrency(nextCurrency);
    window.dispatchEvent(new Event("tiger-store-currency-updated"));
  };

  const toggleCurrency = () => {
    setCurrency(currency === "DZD" ? "USD" : "DZD");
  };

  return { currency, setCurrency, toggleCurrency };
}
