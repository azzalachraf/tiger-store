"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductOffers } from "@/lib/cart";
import { formatDzd } from "@/lib/currency";
import { Product } from "@/lib/types";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/useLocale";

function priceLabel(product: Product, locale: "ar" | "en" | "fr") {
  if (product.price <= 0) return t(locale, "priceUnavailable");
  const prices = getProductOffers(product).map((offer) => offer.price).filter((price) => price > 0);
  const low = Math.min(...prices); const high = Math.max(...prices);
  return low === high ? formatDzd(low) : `${t(locale, "fromPrice")} ${formatDzd(low)}`;
}

export function ProductCard({ product, compact = false, priority = false }: { product: Product; compact?: boolean; priority?: boolean }) {
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const benefit = isArabic ? product.shortDescriptionAr : product.shortDescriptionEn;
  const unavailableAction = isArabic ? "أخبرني عند التوفر" : "Notify me when available";
  return <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface)] transition-colors hover:border-[#FF7300]">
    <Link href={`/products/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-[var(--page)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tiger-ember" aria-label={`${t(locale, "viewProduct")}: ${locale === "ar" ? product.nameAr : product.name}`}>
      <Image src={product.image} alt={`${locale === "ar" ? product.nameAr : product.name} — ${t(locale, "productArtwork")}`} fill sizes="(min-width: 1280px) 23vw, (min-width: 768px) 31vw, 50vw" className="object-contain p-2 transition-transform duration-200 group-hover:scale-[1.02]" priority={priority} loading={priority ? undefined : "lazy"} />
    </Link>
    <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-4"}`}>
      <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-11 text-base font-black leading-5 text-[#151515] hover:text-[#C54E00] focus-visible:outline-none">{isArabic ? product.nameAr : product.name}</Link>
      <p className="mt-2 line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-[var(--muted-text)]">{benefit}</p>
      <p className="mt-3 text-lg font-black text-[#C54E00]" dir="ltr">{priceLabel(product, locale)}</p>{product.priceOptions?.length && <p className="mt-1 text-xs font-semibold text-[var(--muted-text)]">{t(locale, "priceVaries")}</p>}
      <p className={`mt-2 text-sm font-bold ${product.available ? "text-[#16803C]" : "text-[#C62828]"}`}>{product.available ? t(locale, "inStock") : t(locale, "outOfStock")}</p>
      {product.available ? <Button asChild size="sm" className="mt-4 min-h-11 w-full rounded-full"><Link href={`/products/${product.slug}`}>{t(locale, "buyNow")} <ArrowUpRight className="h-4 w-4" /></Link></Button> : <Button asChild variant="secondary" size="sm" className="mt-4 min-h-11 w-full rounded-full"><Link href={`/products/${product.slug}`}>{unavailableAction}</Link></Button>}
    </div>
  </article>;
}
