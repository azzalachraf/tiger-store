import { getProductOffers } from "@/lib/cart";
import { formatDzd } from "@/lib/currency";
import { productCategories, optionValue } from "@/lib/product-localization";
import type { Locale, Product, ProductPriceOption } from "@/lib/types";
import { homeCopy } from "./copy";

export type HomeProduct = {
  id: string;
  slug: string;
  href: string;
  name: string;
  image: string;
  available: boolean;
  category: string;
  categoryId: string;
  price: string;
  startingPrice: number;
  duration: string;
};

function durationValue(offer: ProductPriceOption, locale: Locale) {
  const raw = offer.duration || offer.label;
  const match = raw.match(/^(\d+)\s*(months?|years?|days?|weeks?)$/i);
  if (match) {
    const count = Number(match[1]);
    const unit = match[2].toLowerCase().replace(/s$/, "");
    const names: Record<string, Record<Locale, string>> = {
      month: {
        ar:
          count === 1
            ? "شهر واحد"
            : count === 2
              ? "شهران"
              : `${count} ${count <= 10 ? "أشهر" : "شهراً"}`,
        fr: `${count} mois`,
        en: `${count} month${count === 1 ? "" : "s"}`,
      },
      year: {
        ar:
          count === 1
            ? "سنة واحدة"
            : count === 2
              ? "سنتان"
              : `${count} ${count <= 10 ? "سنوات" : "سنة"}`,
        fr: `${count} an${count === 1 ? "" : "s"}`,
        en: `${count} year${count === 1 ? "" : "s"}`,
      },
      day: {
        ar:
          count === 1
            ? "يوم واحد"
            : count === 2
              ? "يومان"
              : `${count} ${count <= 10 ? "أيام" : "يوماً"}`,
        fr: `${count} jour${count === 1 ? "" : "s"}`,
        en: `${count} day${count === 1 ? "" : "s"}`,
      },
      week: {
        ar:
          count === 1
            ? "أسبوع واحد"
            : count === 2
              ? "أسبوعان"
              : `${count} ${count <= 10 ? "أسابيع" : "أسبوعاً"}`,
        fr: `${count} semaine${count === 1 ? "" : "s"}`,
        en: `${count} week${count === 1 ? "" : "s"}`,
      },
    };
    return {
      label: names[unit][locale],
      rank: count * ({ day: 1, week: 7, month: 30, year: 365 }[unit] ?? 1),
    };
  }
  const translated = optionValue(offer, locale, "duration");
  return {
    label:
      locale === "fr" && translated === raw
        ? homeCopy.fr.durationDetails
        : translated || homeCopy[locale].durationDetails,
    rank: 0,
  };
}

export function homeProduct(product: Product, locale: Locale): HomeProduct {
  const offers = getProductOffers(product);
  const availableOffers = offers.filter(
    (offer) => offer.available !== false && offer.price > 0,
  );
  const shown = availableOffers.length ? availableOffers : offers;
  const prices = shown.map((offer) => offer.price).filter((price) => price > 0);
  const low = Math.min(...prices),
    high = Math.max(...prices);
  const durations = shown
    .map((offer) => durationValue(offer, locale))
    .sort((a, b) => a.rank - b.rank);
  const first = durations[0]?.label,
    last = durations.at(-1)?.label;
  const category = productCategories.find((entry) =>
    (entry.matches as readonly string[]).includes(product.category),
  );
  return {
    id: product.id,
    slug: product.slug,
    href: `/products/${product.slug}`,
    name: locale === "ar" ? product.nameAr || product.name : product.name,
    image: product.image,
    available: product.available && availableOffers.length > 0,
    category:
      category?.[locale] ??
      (locale === "ar"
        ? product.categoryAr
        : locale === "fr"
          ? "Abonnements"
          : product.category),
    categoryId: category?.id ?? "other",
    price: prices.length
      ? low === high
        ? formatDzd(low)
        : `${formatDzd(low)} – ${formatDzd(high)}`
      : "—",
    startingPrice: prices.length ? low : Number.MAX_SAFE_INTEGER,
    duration:
      first && last
        ? first === last
          ? first
          : `${first} – ${last}`
        : homeCopy[locale].durationDetails,
  };
}
