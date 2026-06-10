"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Heart, ShoppingCart, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CurrencyPrice } from "@/components/CurrencyPrice";
import { Button } from "@/components/ui/button";
import { addCartItem, createCartItem } from "@/lib/cart";
import { Product, ProductPriceOption } from "@/lib/types";
import { calculateDiscount, cn } from "@/lib/utils";
import { useLocale } from "@/lib/useLocale";
import { readWishlist, toggleWishlist } from "@/lib/wishlist";
import { trackAddToCart, trackViewContent } from "@/lib/meta-pixel";

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
  const direction = locale === "ar" ? "rtl" : "ltr";
  const description = locale === "ar"
    ? product.shortDescriptionAr || product.shortDescriptionEn
    : product.shortDescriptionEn || product.shortDescriptionAr;
  const features = locale === "ar" && product.featuresAr?.length > 0 ? product.featuresAr : product.featuresEn;

  const labels = locale === "ar"
    ? {
        home: "الرئيسية",
        soldOut: "غير متوفر",
        available: "متوفر",
        unavailable: "غير متوفر",
        duration: "المدة",
        activation: "نوع التفعيل",
        productType: "نوع المنتج",
        availability: "التوفر",
        chooseOption: "اختر المدة",
        paymentMethods: "طرق الدفع: BaridiMob, CCP, RedotPay.",
        addToCart: "أضف إلى السلة",
        added: "تمت الإضافة",
        buyNow: "اشتر الآن",
        saved: "محفوظ",
        addWishlist: "أضف للمفضلة",
        back: "العودة للمتجر",
        description: "الوصف",
        features: "المميزات",
      }
    : {
        home: "Home",
        soldOut: "Sold out",
        available: "Available",
        unavailable: "Unavailable",
        duration: "Duration",
        activation: "Type of Activation",
        productType: "Type of Product",
        availability: "Availability",
        chooseOption: "Choose option",
        paymentMethods: "Payment methods: BaridiMob, CCP, RedotPay.",
        addToCart: "Add to Cart",
        added: "Added",
        buyNow: "Buy Now",
        saved: "Saved",
        addWishlist: "Add to wishlist",
        back: "Back to Shop",
        description: "Description",
        features: "Features",
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

  useEffect(() => {
    trackViewContent({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
    });

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "product_view", product_id: product.id }),
    }).catch(() => {});
  }, [product.id, product.name, product.category, product.price]);

  function addToCart() {
    if (unavailable) return;

    addCartItem(createCartItem(product, selectedOffer));
    setAdded(true);
    trackAddToCart({
      id: product.id,
      name: product.name,
      price: selectedOffer.price,
      quantity: 1,
    });

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "add_to_cart", product_id: product.id }),
    }).catch(() => {});
  }

  function handleWishlist() {
    setWishlisted(toggleWishlist(product.id).includes(product.id));
  }

  return (
    <section className="space-y-12">
      <div
        className="grid gap-6 xl:grid-cols-[480px_minmax(0,1fr)_360px] xl:items-start"
        dir="ltr"
        style={{ direction: "ltr" }}
      >
        <div className="xl:col-start-1">
          <div className="overflow-hidden rounded-md bg-[#2b2b2b] shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#202020]">
            <Image
              src={product.image}
              alt={`${product.name} product card`}
              fill
              sizes="(min-width: 1280px) 480px, (min-width: 1024px) 440px, 100vw"
              className="object-contain p-3"
              priority
            />
            {!product.available ? (
              <span className="absolute left-4 top-4 rounded-full bg-black px-3 py-1 text-xs font-black uppercase text-white">
                {labels.soldOut}
              </span>
            ) : discount ? (
              <span className="absolute left-4 top-4 rounded-full bg-[#252525] px-3 py-1 text-xs font-black text-tiger-gold">
                -{discount}%
              </span>
            ) : null}
          </div>
          </div>
        </div>

        <div className="min-w-0 py-1 xl:col-start-2" dir={direction}>
          <div className="text-sm font-bold text-white/55">
            <Link href="/" className="hover:text-tiger-gold">{labels.home}</Link>
            <span className="mx-2">/</span>
            <Link href={`/categories/${product.category.toLowerCase().replace(/\s+/g, "-")}`} className="hover:text-tiger-gold">
              {product.category}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-white">{product.name}</span>
          </div>

          <h1 className="mt-7 max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-center gap-2 text-tiger-gold" aria-label="Rated 5 out of 5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-4 w-4 fill-current" />
            ))}
            <span className="text-xs font-black text-white/50">5.0</span>
          </div>

          <div className="mt-8 grid gap-x-10 gap-y-6 border-b border-white/10 pb-8 sm:grid-cols-2 xl:grid-cols-3">
            <InfoItem label={labels.duration} value={locale === "ar" ? selectedOffer.durationAr : selectedOffer.duration} />
            <InfoItem label={labels.activation} value={locale === "ar" ? product.activationTypeAr : product.activationTypeEn} />
            <InfoItem label={labels.productType} value={product.category} />
            <InfoItem label={labels.availability} value={unavailable ? labels.unavailable : labels.available} />
          </div>

          {offers.length > 1 ? (
            <div className="mt-8">
              <p className="mb-3 font-black text-white">{labels.chooseOption}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {offers.map((offer) => {
                  const optionDiscount = calculateDiscount(offer.oldPrice, offer.price);
                  const disabled = offer.available === false;
                  const title = locale === "ar" ? offer.labelAr : offer.label;
                  const subtitle = locale === "ar" ? offer.label : offer.labelAr;

                  return (
                    <button
                      key={offer.key}
                      type="button"
                      onClick={() => !disabled && setSelectedKey(offer.key)}
                      disabled={disabled}
                      className={cn(
                        "rounded-md border bg-[#242424] p-4 text-start transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45",
                        selectedKey === offer.key
                          ? "border-tiger-ember bg-tiger-ember/14"
                          : "border-white/10 hover:border-tiger-ember/45",
                      )}
                    >
                      <span className="block font-black text-white">{title}</span>
                      <span className="mt-1 block text-xs font-bold text-white/50" dir="ltr">{subtitle}</span>
                      <span className="mt-3 block text-sm font-black text-tiger-gold">
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

        <aside className="w-full rounded-md bg-[#303030] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] xl:col-start-3 xl:sticky xl:top-24" dir={direction}>
          <div className="flex flex-wrap items-end gap-3">
            {selectedOffer.oldPrice && selectedOffer.oldPrice > selectedOffer.price ? (
              <p className="pb-1 text-base font-bold text-white/40 line-through">
                <CurrencyPrice amount={selectedOffer.oldPrice} locale={locale} />
              </p>
            ) : null}
            <CurrencyPrice amount={selectedOffer.price} locale={locale} className="text-3xl font-black text-tiger-ember" />
          </div>

          <div className="mt-5 rounded-md border border-tiger-ember/20 bg-tiger-ember/10 p-3 text-sm font-bold leading-7 text-white">
            {labels.paymentMethods}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
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
          </div>

          <button
            type="button"
            onClick={handleWishlist}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-black/25 text-sm font-black text-white transition-colors duration-150 hover:bg-white/10"
          >
            <Heart className={cn("h-4 w-4", wishlisted && "fill-tiger-ember text-tiger-ember")} />
            {wishlisted ? labels.saved : labels.addWishlist}
          </button>

          <Button asChild variant="ghost" className="mt-3 w-full rounded-full">
            <Link href="/shop">
              <ArrowRight className="h-4 w-4" />
              {labels.back}
            </Link>
          </Button>
        </aside>
      </div>

      <div className="max-w-5xl" dir={direction}>
        <h2 className="text-2xl font-black text-white">{labels.description}</h2>
        <div className="mt-5 border-t border-white/10 pt-6">
          <p className="max-w-3xl whitespace-pre-line text-base font-bold leading-8 text-white/82">
            {description}
          </p>

          {features?.length ? (
            <div className="mt-7">
              <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-white/50">
                {labels.features}
              </h3>
              <ul className="grid max-w-4xl gap-3 sm:grid-cols-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 font-bold text-white/80">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tiger-ember/20 text-tiger-gold">
                      <Check className="h-3 w-3" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black text-white/72">{label}</p>
      <p className="mt-3 text-sm font-black leading-6 text-tiger-ember">{value}</p>
    </div>
  );
}
