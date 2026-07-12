"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, Clock3, CreditCard, Heart, MessageCircle, PackageCheck, ShieldCheck, ShoppingCart, Star, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CurrencyPrice } from "@/components/CurrencyPrice";
import { Button } from "@/components/ui/button";
import { addCartItem, createCartItem } from "@/lib/cart";
import { categorySlug } from "@/lib/categories";
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
        chooseOption: "اختر الخطة",
        paymentMethods: "الدفع متاح عبر BaridiMob و CCP و RedotPay.",
        addToCart: "أضف إلى السلة",
        added: "تمت الإضافة",
        buyNow: "اشتر الآن",
        saved: "محفوظ",
        addWishlist: "أضف للمفضلة",
        back: "العودة للمتجر",
        description: "تفاصيل المنتج",
        features: "المميزات",
        rating: "تقييم العملاء",
        support: "الدعم عبر واتساب بعد الطلب",
        fast: "تفعيل سريع حسب توفر المنتج",
        guarantee: "نراجع الطلب قبل إرسال تفاصيل الدفع",
        payments: "طرق دفع محلية",
      }
    : {
        home: "Home",
        soldOut: "Sold out",
        available: "Available",
        unavailable: "Unavailable",
        duration: "Duration",
        activation: "Activation type",
        productType: "Product type",
        availability: "Availability",
        chooseOption: "Choose plan",
        paymentMethods: "Payment available with BaridiMob, CCP, and RedotPay.",
        addToCart: "Add to Cart",
        added: "Added",
        buyNow: "Buy Now",
        saved: "Saved",
        addWishlist: "Add to wishlist",
        back: "Back to Shop",
        description: "Product details",
        features: "Features",
        rating: "Customer rating",
        support: "WhatsApp support after order",
        fast: "Fast activation depending on availability",
        guarantee: "We review the order before payment details",
        payments: "Local payment methods",
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
    <section className="space-y-10">
      <div className="grid gap-6 xl:grid-cols-[minmax(340px,480px)_minmax(0,1fr)_360px] xl:items-start" dir={direction}>
        <div className="xl:col-start-1">
          <div className="motion-reveal overflow-hidden rounded-md border border-white/10 bg-[#202020] shadow-[0_24px_70px_rgba(0,0,0,0.36)]">
            <div className="relative aspect-[4/5] overflow-hidden bg-[#101010]">
              <Image
                src={product.image}
                alt={`${product.name} product card`}
                fill
                sizes="(min-width: 1280px) 480px, (min-width: 1024px) 440px, 100vw"
                className="object-contain p-3"
                priority
              />
              {!product.available ? (
                <span className="absolute left-4 top-4 rounded-full bg-black/85 px-3 py-1 text-xs font-black uppercase text-white">
                  {labels.soldOut}
                </span>
              ) : discount ? (
                <span className="absolute left-4 top-4 rounded-full bg-tiger-gold px-3 py-1 text-xs font-black text-black">
                  -{discount}%
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="motion-reveal min-w-0 py-1 xl:col-start-2">
          <div className="text-sm font-bold text-white/55">
            <Link href="/" className="hover:text-tiger-gold">{labels.home}</Link>
            <span className="mx-2">/</span>
            <Link href={`/categories/${categorySlug(product.category)}`} className="hover:text-tiger-gold">
              {product.category}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-white">{product.name}</span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-tiger-ember/25 bg-tiger-ember/10 px-3 py-1 text-xs font-black text-tiger-gold">
              {product.category}
            </span>
            <span className={cn("rounded-full px-3 py-1 text-xs font-black", unavailable ? "bg-white/8 text-white/50" : "bg-emerald-400/10 text-emerald-300")}>
              {unavailable ? labels.unavailable : labels.available}
            </span>
          </div>

          <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-white sm:text-5xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-center gap-2 text-tiger-gold" aria-label="Rated 5 out of 5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-4 w-4 fill-current" />
            ))}
            <span className="text-xs font-black text-white/50">5.0 · {labels.rating}</span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoItem icon={<Clock3 className="h-4 w-4" />} label={labels.duration} value={locale === "ar" ? selectedOffer.durationAr : selectedOffer.duration} />
            <InfoItem icon={<Zap className="h-4 w-4" />} label={labels.activation} value={locale === "ar" ? product.activationTypeAr : product.activationTypeEn} />
            <InfoItem icon={<PackageCheck className="h-4 w-4" />} label={labels.productType} value={locale === "ar" ? product.categoryAr || product.category : product.category} />
            <InfoItem icon={<ShieldCheck className="h-4 w-4" />} label={labels.availability} value={unavailable ? labels.unavailable : labels.available} />
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <TrustNote icon={<MessageCircle className="h-4 w-4" />} text={labels.support} />
            <TrustNote icon={<CreditCard className="h-4 w-4" />} text={labels.payments} />
            <TrustNote icon={<ShieldCheck className="h-4 w-4" />} text={labels.guarantee} />
          </div>

          {offers.length > 1 ? (
            <div className="mt-7">
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
                        "tap-feedback rounded-md border bg-[#202020] p-4 text-start transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tiger-ember",
                        selectedKey === offer.key
                          ? "border-tiger-ember bg-tiger-ember/12"
                          : "border-white/10 hover:border-tiger-ember/45",
                      )}
                    >
                      <span className="block font-black text-white">{title}</span>
                      <span className="mt-1 block text-xs font-bold text-white/50" dir="ltr">{subtitle}</span>
                      <span className="mt-3 block text-sm font-black text-tiger-gold">
                        <CurrencyPrice amount={offer.price} locale={locale} />
                        {optionDiscount ? ` · -${optionDiscount}%` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="premium-card motion-reveal w-full rounded-md p-5 xl:col-start-3 xl:sticky xl:top-24">
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

          <div className="mt-5 grid gap-3">
            {unavailable ? (
              <Button type="button" disabled className="w-full rounded-full">
                {labels.buyNow}
              </Button>
            ) : (
              <Button asChild className="w-full rounded-full">
                <Link href={`/checkout?${checkoutParams.toString()}`}>{labels.buyNow}</Link>
              </Button>
            )}
            <Button type="button" onClick={addToCart} disabled={unavailable} variant="secondary" className="w-full rounded-full">
              <ShoppingCart className="h-4 w-4" />
              {added ? labels.added : labels.addToCart}
            </Button>
          </div>

          <button
            type="button"
            onClick={handleWishlist}
            className="tap-feedback mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-black/25 text-sm font-black text-white transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tiger-ember"
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

      <div className="motion-reveal rounded-md border border-white/10 bg-[#181818] p-5 shadow-[0_20px_55px_rgba(0,0,0,0.28)] sm:p-7" dir={direction}>
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
              <ul className="grid max-w-5xl gap-3 sm:grid-cols-2">
                {features.map((feature, index) => (
                  <li key={index} className="motion-card flex items-center gap-3 rounded-md border border-white/8 bg-white/[0.035] p-3 font-bold text-white/80">
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

function InfoItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="motion-card rounded-md border border-white/9 bg-white/[0.035] p-4">
      <div className="mb-3 flex items-center gap-2 text-tiger-gold">
        {icon}
        <p className="text-xs font-black text-white/72">{label}</p>
      </div>
      <p className="text-sm font-black leading-6 text-white">{value || "-"}</p>
    </div>
  );
}

function TrustNote({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex min-h-12 items-center gap-2 rounded-md border border-white/8 bg-black/18 px-3 text-xs font-black leading-5 text-white/72">
      <span className="text-tiger-gold">{icon}</span>
      {text}
    </div>
  );
}
