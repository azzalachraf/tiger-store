"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, Search, ShoppingBag, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { CurrencyPrice } from "@/components/CurrencyPrice";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/types";
import { calculateDiscount, cn } from "@/lib/utils";
import { useLocale } from "@/lib/useLocale";
import { readWishlist, toggleWishlist } from "@/lib/wishlist";

type ProductCardProps = {
  product: Product;
  compact?: boolean;
};

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const discount = calculateDiscount(product.oldPrice, product.price);
  const hasOptions = Boolean(product.priceOptions?.length);
  const [wishlisted, setWishlisted] = useState(false);
  const { locale } = useLocale();
  const labels = locale === "ar"
    ? {
        from: "ابتداءا من ",
        duration: "المدة",
        available: "متوفر",
        unavailable: "غير متوفر",
        soldOut: "غير متوفر",
        buyNow: "اشتر الآن",
        details: "التفاصيل",
      }
    : {
        from: "From ",
        duration: "Duration",
        available: "Available",
        unavailable: "Unavailable",
        soldOut: "Sold out",
        buyNow: "Buy Now",
        details: "Details",
      };

  useEffect(() => {
    const update = () => setWishlisted(readWishlist().includes(product.id));
    update();
    window.addEventListener("tiger-store-wishlist-updated", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("tiger-store-wishlist-updated", update);
      window.removeEventListener("storage", update);
    };
  }, [product.id]);

  function handleWishlist() {
    setWishlisted(toggleWishlist(product.id).includes(product.id));
  }

  const buyHref = hasOptions ? `/products/${product.slug}` : `/checkout?product=${product.slug}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-md border border-white/8 bg-[#202020] shadow-[0_18px_38px_rgba(0,0,0,0.28)] transition-all duration-150 hover:-translate-y-0.5 hover:border-white/16 hover:shadow-[0_24px_52px_rgba(0,0,0,0.42)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#151515]">
        <Image
          src={product.image}
          alt={`${product.name} product card`}
          fill
          sizes="(min-width: 1280px) 23vw, (min-width: 768px) 31vw, 50vw"
          className="object-contain p-0.5 transition-transform duration-200 group-hover:scale-[1.025]"
          loading="lazy"
        />
        <Link href={`/products/${product.slug}`} className="absolute inset-0 z-10" aria-label={`View ${product.name}`} />

        <div className="absolute right-2 top-2 z-20 flex translate-y-0 flex-col gap-1.5 rounded-md bg-black/90 p-1.5 opacity-100 shadow-[0_14px_28px_rgba(0,0,0,0.5)] transition-all duration-150 md:-translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white transition-colors duration-150 hover:bg-white/12"
            aria-label={`View details for ${product.name}`}
          >
            <Search className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={handleWishlist}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white transition-colors duration-150 hover:bg-white/12"
            aria-label={`${wishlisted ? "Remove" : "Add"} ${product.name} wishlist`}
          >
            <Heart className={cn("h-4 w-4", wishlisted && "fill-tiger-ember text-tiger-ember")} />
          </button>
        </div>

        {!product.available ? (
          <span className="absolute left-2 top-2 z-20 rounded-full bg-black px-3 py-1 text-[11px] font-black uppercase text-white">
            {labels.soldOut}
          </span>
        ) : discount ? (
          <span className="absolute left-2 top-2 z-20 rounded-full bg-[#242424] px-3 py-1 text-[11px] font-black text-tiger-gold">
            -{discount}%
          </span>
        ) : null}
      </div>

      <div className={cn("flex flex-1 flex-col", compact ? "p-2.5" : "p-3")}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-black uppercase tracking-[0.08em] text-tiger-gold">{product.category}</p>
          <div className="flex items-center gap-0.5 text-tiger-gold" aria-label="Rated 5 out of 5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-3.5 w-3.5 fill-current" />
            ))}
          </div>
        </div>

        <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-[42px] text-sm font-black leading-5 text-white transition-colors duration-150 hover:text-tiger-gold sm:text-base">
          {product.name}
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <p className="text-base font-black text-tiger-ember sm:text-lg">
            <CurrencyPrice amount={product.price} locale={locale} prefix={hasOptions ? labels.from : ""} />
          </p>
          {product.oldPrice && product.oldPrice > product.price ? (
            <CurrencyPrice amount={product.oldPrice} locale={locale} className="text-xs font-bold text-white/40 line-through" />
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold text-white/54">
          <span className="truncate">
            {labels.duration}: {locale === "ar" ? product.durationAr : product.duration}
          </span>
          <span className={cn(product.available ? "text-emerald-300" : "text-white/40")}>{product.available ? labels.available : labels.unavailable}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button asChild size="sm" className="min-h-9 rounded-full px-2 text-xs">
            <Link href={buyHref}>
              <ShoppingBag className="h-4 w-4" />
              {labels.buyNow}
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm" className="min-h-9 rounded-full px-2 text-xs">
            <Link href={`/products/${product.slug}`}>
              <Eye className="h-4 w-4" />
              {labels.details}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
