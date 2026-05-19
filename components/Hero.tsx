"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgePercent, Star } from "lucide-react";
import { CurrencyPrice } from "@/components/CurrencyPrice";
import { Product } from "@/lib/types";
import { useLocale } from "@/lib/useLocale";

const mainHeroImage = "/hero/Hero section image.png?v=20260518-1923";

const promoImages = [
  {
    title: "Digital subscriptions",
    href: "/shop",
    image: "/hero/All whaat you need.png",
  },
  {
    title: "Payment methods",
    href: "/payment-methods",
    image: "/hero/Payment.png",
  },
  {
    title: "Customer support",
    href: "/contact",
    image: "/hero/Client service.png",
  },
  {
    title: "Social channels",
    href: "/contact",
    image: "/hero/Follow us.png",
  },
];

type HeroProps = {
  products: Product[];
};

export function Hero({ products }: HeroProps) {
  const { locale } = useLocale();
  const discountedProducts = products.filter((product) => product.oldPrice && product.oldPrice > product.price);
  const railProducts = (discountedProducts.length ? discountedProducts : products.filter((product) => product.featured)).slice(0, 4);

  return (
    <section className="store-shell border-b border-white/10">
      <div className="mx-auto max-w-[1440px] px-3 py-5 sm:px-5 lg:px-8 lg:py-10">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2.45fr)_320px] lg:items-start" dir="ltr">
          <Link
            href="/shop"
            className="group relative block overflow-hidden rounded-md border border-white/10 bg-[#161616] shadow-[0_20px_55px_rgba(0,0,0,0.38)]"
            aria-label="Shop Tiger Store"
          >
            <div className="relative aspect-[1672/941]">
              <Image
                src={mainHeroImage}
                alt="Tiger Store main hero banner"
                fill
                sizes="(min-width: 1024px) 68vw, 100vw"
                className="object-contain"
                priority
              />
            </div>
          </Link>

          <aside className="store-panel rounded-md p-4" dir="rtl">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-tiger-ember/30 bg-tiger-ember/12 text-tiger-gold">
                <BadgePercent className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-black text-white">{locale === "ar" ? "العروض المميزة" : "Featured picks"}</p>
                <p className="text-xs font-bold text-white/50">{locale === "ar" ? "منتجات مختارة" : "Selected products"}</p>
              </div>
            </div>

            <div className="grid gap-3">
              {railProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group grid grid-cols-[70px_1fr] gap-3 rounded-md p-2 transition-colors duration-150 hover:bg-white/5"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-white/10 bg-[#111]">
                    <Image src={product.image} alt={product.name} fill sizes="80px" className="object-contain p-0.5" />
                  </div>
                  <div className="min-w-0 py-1">
                    <h3 className="line-clamp-2 text-sm font-black leading-5 text-white transition-colors duration-150 group-hover:text-tiger-gold">
                      {product.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1 text-tiger-gold" aria-label="Rated 5 out of 5">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <CurrencyPrice amount={product.price} locale={locale} className="mt-1 text-sm font-black text-tiger-ember" />
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-7" dir="ltr">
          {promoImages.map((promo) => (
            <Link
              key={promo.image}
              href={promo.href}
              className="group overflow-hidden rounded-md border border-white/10 bg-[#161616] shadow-[0_18px_42px_rgba(0,0,0,0.34)] transition-all duration-150 hover:-translate-y-0.5 hover:border-tiger-ember/50"
            >
              <div className="relative aspect-square">
                <Image
                  src={promo.image}
                  alt={promo.title}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-contain"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
