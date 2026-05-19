"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, ShoppingCart, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CurrencyPrice } from "@/components/CurrencyPrice";
import { Button } from "@/components/ui/button";
import { addCartItem, createCartItem } from "@/lib/cart";
import { Product, ProductPriceOption } from "@/lib/types";
import { calculateDiscount, cn } from "@/lib/utils";
import { useLocale } from "@/lib/useLocale";
import { readWishlist, toggleWishlist } from "@/lib/wishlist";

type ProductDetailsProps = {
  product: Product;
};

type SelectedOffer = ProductPriceOption & {
  key: string;
};

export function ProductDetails({ product }: ProductDetailsProps) {
  const offers = useMemo<SelectedOffer[]>(() => {
    if (product.priceOptions?.length) {
      return product.priceOptions.map((option) => ({ ...option, key: option.label }));
    }

    return [
      {
        key: "default",
        label: product.duration,
        labelAr: product.durationAr,
        price: product.price,
        oldPrice: product.oldPrice,
        duration: product.duration,
        durationAr: product.durationAr,
        available: product.available,
      },
    ];
  }, [product]);

  const [selectedKey, setSelectedKey] = useState(offers[0]?.key ?? "default");
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const { locale } = useLocale();
  const selectedOffer = offers.find((offer) => offer.key === selectedKey) ?? offers[0];
  const discount = calculateDiscount(selectedOffer.oldPrice ?? product.oldPrice, selectedOffer.price);
  const unavailable = !product.available || selectedOffer.available === false;
  const labels = locale === "ar"
    ? {
        home: "الرئيسية",
        soldOut: "غير متوفر",
        available: "متوفر",
        unavailable: "غير متوفر",
        duration: "المدة",
        availability: "التوفر",
        chooseOption: "اختر المدة",
        paymentMethods: "طرق الدفع: BaridiMob, CCP, RedotPay.",
        addToCart: "أضف إلى السلة",
        added: "تمت الإضافة",
        buyNow: "اشتر الآن",
        saved: "محفوظ",
        addWishlist: "أضف للمفضلة",
        back: "العودة للمتجر",
      }
    : {
        home: "Home",
        soldOut: "Sold out",
        available: "Available",
        unavailable: "Unavailable",
        duration: "Duration",
        availability: "Availability",
        chooseOption: "Choose option",
        paymentMethods: "Payment methods: BaridiMob, CCP, RedotPay.",
        addToCart: "Add to Cart",
        added: "Added",
        buyNow: "Buy Now",
        saved: "Saved",
        addWishlist: "Add to Wishlist",
        back: "Back to Shop",
      };
  const checkoutParams = new URLSearchParams({
    product: product.slug,
    option: selectedOffer.label,
    price: String(selectedOffer.price),
  });

  useEffect(() => {
    const update = () => setWishlisted(readWishlist().includes(product.id));
    update();
    window.addEventListener("tiger-store-wishlist-updated", update);
    return () => window.removeEventListener("tiger-store-wishlist-updated", update);
  }, [product.id]);

  function addToCart() {
    if (unavailable) return;
    addCartItem(createCartItem(product, selectedOffer));
    setAdded(true);
  }

  function handleWishlist() {
    setWishlisted(toggleWishlist(product.id).includes(product.id));
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(320px,500px)_1fr_340px] lg:items-start">
      <div className="store-panel rounded-md p-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-[#151515]">
          <Image
            src={product.image}
            alt={`${product.name} product card`}
            fill
            sizes="(min-width: 1024px) 500px, 100vw"
            className="object-contain p-1"
            priority
          />
          {!product.available ? (
            <span className="absolute left-3 top-3 rounded-full bg-black px-3 py-1 text-xs font-black uppercase text-white">
              {labels.soldOut}
            </span>
          ) : discount ? (
            <span className="absolute left-3 top-3 rounded-full bg-[#252525] px-3 py-1 text-xs font-black text-tiger-gold">
              -{discount}%
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-4 text-sm font-bold text-white/55">
          <Link href="/" className="hover:text-tiger-gold">{labels.home}</Link>
          <span className="mx-2">/</span>
          <Link href={`/categories/${product.category.toLowerCase().replace(/\s+/g, "-")}`} className="hover:text-tiger-gold">
            {product.category}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">{product.name}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-tiger-ember/30 bg-tiger-ember/12 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-tiger-gold">
            {product.category}
          </span>
          <span className={cn("rounded-full border px-3 py-1 text-xs font-black", unavailable ? "border-white/10 text-white/45" : "border-emerald-400/25 text-emerald-300")}>
            {unavailable ? labels.unavailable : labels.available}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">{product.name}</h1>
        <div className="mt-3 flex items-center gap-2 text-tiger-gold" aria-label="Rated 5 out of 5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className="h-4 w-4 fill-current" />
          ))}
          <span className="text-xs font-black text-white/45">5.0</span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <InfoCard label={labels.duration} value={locale === "ar" ? selectedOffer.durationAr : selectedOffer.duration} />
          <InfoCard label={labels.availability} value={unavailable ? labels.unavailable : labels.available} />
        </div>

        {offers.length > 1 ? (
          <div className="mt-6">
            <p className="mb-3 font-black text-white">{labels.chooseOption}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {offers.map((offer) => {
                const optionDiscount = calculateDiscount(offer.oldPrice, offer.price);
                const disabled = offer.available === false;
                return (
                  <button
                    key={offer.key}
                    type="button"
                    onClick={() => !disabled && setSelectedKey(offer.key)}
                    disabled={disabled}
                    className={cn(
                      "rounded-md border p-3 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45",
                      selectedKey === offer.key
                        ? "border-tiger-ember bg-tiger-ember/14"
                        : "border-white/10 bg-[#202020] hover:border-tiger-ember/45",
                    )}
                  >
                    <span className="block font-black text-white">{offer.label}</span>
                    <span className="mt-1 block text-xs font-bold text-white/50">{offer.labelAr}</span>
                    <span className="mt-2 block text-sm font-black text-tiger-gold">
                      <CurrencyPrice amount={offer.price} locale={locale} />
                      {optionDiscount ? ` / -${optionDiscount}%` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <aside className="store-panel rounded-md p-5 lg:sticky lg:top-24">
        <div className="flex flex-wrap items-end gap-3">
          {selectedOffer.oldPrice && selectedOffer.oldPrice > selectedOffer.price ? (
            <p className="pb-1 text-base font-bold text-white/38 line-through">
              <CurrencyPrice amount={selectedOffer.oldPrice} locale={locale} />
            </p>
          ) : null}
          <CurrencyPrice amount={selectedOffer.price} locale={locale} className="text-3xl font-black text-tiger-ember" />
        </div>

        <div className="mt-4 rounded-md border border-tiger-ember/20 bg-tiger-ember/10 p-3 text-sm font-bold leading-7 text-white">
          {labels.paymentMethods}
        </div>

        <div className="mt-4 grid gap-2">
          <Button type="button" onClick={addToCart} disabled={unavailable} variant="secondary" className="w-full rounded-full">
            <ShoppingCart className="h-4 w-4" />
            {added ? labels.added : labels.addToCart}
          </Button>
          {unavailable ? (
            <Button type="button" disabled className="w-full rounded-full">
              {labels.buyNow}
            </Button>
          ) : (
            <Button asChild className="w-full rounded-full">
              <Link href={`/checkout?${checkoutParams.toString()}`}>{labels.buyNow}</Link>
            </Button>
          )}
          <button
            type="button"
            onClick={handleWishlist}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-black/25 text-sm font-black text-white transition-colors duration-150 hover:bg-white/10"
          >
            <Heart className={cn("h-4 w-4", wishlisted && "fill-tiger-ember text-tiger-ember")} />
            {wishlisted ? labels.saved : labels.addWishlist}
          </button>
          <Button asChild variant="ghost" className="w-full rounded-full">
            <Link href="/shop">
              <ArrowRight className="h-4 w-4" />
              {labels.back}
            </Link>
          </Button>
        </div>
      </aside>
    </section>
  );
}

function InfoCard({ label, value, subLabel }: { label: string; value: string; subLabel?: string }) {
  return (
    <div className="store-panel rounded-md p-3">
      <p className="text-xs font-bold text-white/45">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
      {subLabel ? <p className="mt-1 text-xs font-bold text-tiger-gold">{subLabel}</p> : null}
    </div>
  );
}
