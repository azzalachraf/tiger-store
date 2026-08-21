"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, BadgeCheck, CreditCard, Headphones, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import { CurrencyPrice } from "@/components/CurrencyPrice";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/types";
import { useLocale } from "@/lib/useLocale";

const mainHeroImage = "/hero/Hero section image.png?v=20260709";

type HeroProps = {
  products: Product[];
};

export function Hero({ products }: HeroProps) {
  const { locale } = useLocale();
  const featured = products.filter((product) => product.featured).slice(0, 3);
  const discountedProducts = products.filter((product) => product.oldPrice && product.oldPrice > product.price);
  const highlightProducts = (discountedProducts.length ? discountedProducts : featured).slice(0, 4);

  const copy = locale === "ar"
    ? {
        eyebrow: "متجر اشتراكات",
        title: "اشتراكات أصلية، تفعيل سريع، ودفع واضح.",
        description: "اختر اشتراكك، أرسل الطلب، وتابع معنا حتى يتم التفعيل. استلم طلبك بدون أي تعقيد.",
        primary: "تسوق الآن",
        secondary: "طرق الدفع",
        trust: ["دعم مستمر", "BaridiMob و CCP", "تفعيل حسب المنتج", "ضمان كامل"],
        curated: "اختيارات مطلوبة",
        proof: "متجر موثوق للخدمات",
      }
    : {
        eyebrow: "Subscriptions",
        title: "Original subscriptions, fast activation, clear payment.",
        description: "Choose your subscription, submit the order, and continue until activation. Receive your account with zero hassle.",
        primary: "Shop now",
        secondary: "Payment methods",
        trust: ["Continuous support", "BaridiMob and CCP", "Activation by product", "Full guarantee"],
        curated: "Most requested",
        proof: "Trusted store for services",
      };

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#111]">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-3 py-6 sm:px-5 lg:px-8 lg:py-10" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="order-2 motion-reveal flex min-w-0 flex-col justify-center rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(37,37,37,0.92),rgba(15,15,15,0.98))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.36)] sm:p-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-tiger-ember/25 bg-tiger-ember/10 px-3 py-2 text-xs font-black text-tiger-gold">
            <Sparkles className="h-4 w-4" />
            {copy.eyebrow}
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-8 text-white/68 sm:text-base">
            {copy.description}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild className="min-h-12 rounded-full px-6">
              <Link href="/shop">
                {copy.primary}
                <ArrowUpLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="min-h-12 rounded-full px-6">
              <Link href="/payment-methods">
                <CreditCard className="h-4 w-4" />
                {copy.secondary}
              </Link>
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {copy.trust.map((item, index) => {
              const Icon = [Headphones, CreditCard, Zap, ShieldCheck][index] ?? BadgeCheck;
              return (
                <span key={item} className="trust-chip">
                  <Icon className="h-4 w-4 text-tiger-gold" />
                  {item}
                </span>
              );
            })}
          </div>

          <div className="mt-7 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
            {featured.map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`} className="motion-card group flex items-center gap-3 rounded-md border border-white/8 bg-white/[0.035] p-2 hover:border-tiger-ember/45 hover:bg-white/[0.06]">
                <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-md bg-black/40">
                  <Image src={product.image} alt={product.name} fill sizes="64px" className="object-contain" />
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-1 text-sm font-black text-white transition-colors duration-150 group-hover:text-tiger-gold">{product.name}</span>
                  <CurrencyPrice amount={product.price} locale={locale} className="mt-1 block text-xs font-black text-tiger-ember" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="contents">
          <Link href="/shop" className="order-1 motion-reveal group overflow-hidden rounded-2xl border border-white/10 bg-[#1d1d1d] shadow-[0_28px_80px_rgba(0,0,0,0.38)]" aria-label="Shop Tiger Store">
            <div className="relative aspect-[4/3] sm:aspect-[16/7]">
              <Image
                src={mainHeroImage}
                alt="Tiger Store digital subscriptions"
                fill
                sizes="(min-width: 1440px) 1440px, (min-width: 640px) calc(100vw - 40px), calc(100vw - 24px)"
                className="motion-media object-cover"
                priority
              />
            </div>
          </Link>

          <aside className="order-3 premium-card motion-reveal rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-tiger-gold">{copy.curated}</p>
                <p className="mt-1 text-sm font-bold text-white/58">{copy.proof}</p>
              </div>
              <div className="flex items-center gap-1 text-tiger-gold" aria-label="Rated 5 out of 5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {highlightProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="motion-card group grid grid-cols-[58px_1fr] gap-3 rounded-md border border-white/8 bg-black/18 p-2 hover:border-tiger-ember/45"
                >
                  <span className="relative aspect-[4/5] overflow-hidden rounded-md bg-black/35">
                    <Image src={product.image} alt={product.name} fill sizes="70px" className="object-contain p-0.5" />
                  </span>
                  <span className="min-w-0 py-0.5">
                    <span className="line-clamp-2 text-sm font-black leading-5 text-white group-hover:text-tiger-gold">{product.name}</span>
                    <CurrencyPrice amount={product.price} locale={locale} className="mt-1 block text-sm font-black text-tiger-ember" />
                  </span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
