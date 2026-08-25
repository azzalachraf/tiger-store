"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, Search, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { CurrencyPrice } from "@/components/CurrencyPrice";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/useLocale";
import { readWishlist, toggleWishlist } from "@/lib/wishlist";

export function ProductCard({ product, compact = false, priority = false }: { product: Product; compact?: boolean; priority?: boolean }) {
  const [wishlisted, setWishlisted] = useState(false);
  const { locale } = useLocale();
  const ar = locale === "ar";
  const text = ar ? {
    from: "ابتداءً من ", duration: "المدة", available: "متوفر", unavailable: "غير متوفر", buy: "اشتر الآن", details: "التفاصيل", activation: "التفعيل خلال 15 دقيقة–12 ساعة", priceUnavailable: "السعر غير متوفر",
  } : {
    from: "From ", duration: "Duration", available: "Available", unavailable: "Out of stock", buy: "Buy now", details: "Details", activation: "Activation in 15 min–12 hr", priceUnavailable: "Price unavailable",
  };
  const hasOptions = Boolean(product.priceOptions?.length);

  useEffect(() => {
    const update = () => setWishlisted(readWishlist().includes(product.id));
    update();
    window.addEventListener("tiger-store-wishlist-updated", update);
    return () => window.removeEventListener("tiger-store-wishlist-updated", update);
  }, [product.id]);

  return <article className="motion-card group flex h-full min-w-0 flex-col overflow-hidden rounded-md border border-white/9 bg-[linear-gradient(180deg,#222,#151515)] shadow-[0_18px_44px_rgba(0,0,0,0.3)] hover:border-tiger-ember/35">
    <div className="relative aspect-[4/5] overflow-hidden bg-[#101010]">
      <Image src={product.image} alt={`${product.name} — Tiger Store`} fill sizes="(min-width: 1280px) 23vw, (min-width: 768px) 31vw, 50vw" className="motion-media object-contain p-1.5" priority={priority} loading={priority ? undefined : "lazy"} />
      <Link href={`/products/${product.slug}`} className="absolute inset-0 z-10" aria-label={`${text.details}: ${product.name}`} />
      <div className="absolute end-2 top-2 z-20 flex gap-1.5 rounded-md bg-black/80 p-1.5 shadow-lg">
        <Link href={`/products/${product.slug}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tiger-ember" aria-label={`${text.details}: ${product.name}`}><Search className="h-4 w-4" /></Link>
        <button type="button" onClick={() => setWishlisted(toggleWishlist(product.id).includes(product.id))} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tiger-ember" aria-label={`${wishlisted ? "Remove" : "Add"} ${product.name} wishlist`}><Heart className={cn("h-4 w-4", wishlisted && "fill-tiger-ember text-tiger-ember")} /></button>
      </div>
      {!product.available && <span className="absolute start-2 top-2 z-20 rounded-full bg-black/85 px-3 py-1 text-[11px] font-black text-white">{text.unavailable}</span>}
    </div>
    <div className={cn("flex flex-1 flex-col", compact ? "p-2.5" : "p-3")}>
      <p className="mb-1 truncate text-[11px] font-black uppercase tracking-[0.08em] text-tiger-gold">{ar ? product.categoryAr : product.category}</p>
      <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-[42px] text-sm font-black leading-5 text-white hover:text-tiger-gold focus-visible:outline-none focus-visible:text-tiger-gold sm:text-base">{ar ? product.nameAr : product.name}</Link>
      <p className="mt-2 text-base font-black text-tiger-ember sm:text-lg">{product.price > 0 ? <CurrencyPrice amount={product.price} locale={locale} prefix={hasOptions ? text.from : ""} /> : text.priceUnavailable}</p>
      <div className="mt-2 grid gap-1.5 text-[11px] font-bold text-white/58">
        {product.duration && <span className="truncate rounded-full border border-white/8 bg-white/[0.035] px-2 py-1">{text.duration}: {ar ? product.durationAr : product.duration}</span>}
        <span className={cn("inline-flex w-fit items-center rounded-full px-2 py-1", product.available ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-white/40")}>{product.available ? `${text.available} · ${text.activation}` : text.unavailable}</span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        {product.available ? <Button asChild size="sm" className="min-h-10 rounded-full px-3 text-xs"><Link href={`/products/${product.slug}`}><ShoppingBag className="h-4 w-4" />{text.buy}</Link></Button> : <Button type="button" size="sm" disabled className="min-h-10 rounded-full px-3 text-xs">{text.unavailable}</Button>}
        <Button asChild variant="secondary" size="sm" className="min-h-10 rounded-full px-3 text-xs" aria-label={`${text.details}: ${product.name}`}><Link href={`/products/${product.slug}`}><Eye className="h-4 w-4" /></Link></Button>
      </div>
    </div>
  </article>;
}
