"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CircleDollarSign, Globe2, Heart, Search, ShoppingCart, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { readCart } from "@/lib/cart";
import { readWishlist } from "@/lib/wishlist";
import { useCurrency } from "@/lib/useCurrency";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/useLocale";

const navItems = [
  { href: "/", ar: "الرئيسية", en: "Home" },
  { href: "/shop", ar: "المتجر", en: "Shop" },
  { href: "/categories", ar: "الأقسام", en: "Categories" },
  { href: "/shop?sale=true", ar: "العروض", en: "Deals" },
  { href: "/payment-methods", ar: "الدفع", en: "Payment" },
  { href: "/faq", ar: "الأسئلة", en: "FAQ" },
  { href: "/contact", ar: "الدعم", en: "Support" },
];

const BRAND_LOGO = "/logo/tiger-store-ui.png";

export function Header() {
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const { locale, toggleLocale } = useLocale();
  const { currency, toggleCurrency } = useCurrency();

  useEffect(() => {
    const update = () => {
      setWishlistCount(readWishlist().length);
      setCartCount(readCart().reduce((total, item) => total + item.quantity, 0));
    };

    update();
    window.addEventListener("tiger-store-wishlist-updated", update);
    window.addEventListener("tiger-store-cart-updated", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("tiger-store-wishlist-updated", update);
      window.removeEventListener("tiger-store-cart-updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#141414]/94 shadow-[0_16px_40px_rgba(0,0,0,0.36)] backdrop-blur-xl" dir="ltr">
      <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-3 px-3 sm:px-5 lg:px-8">
        <Link href="/" className="flex min-w-[112px] items-center gap-3 sm:min-w-[190px]" aria-label="Tiger Store homepage">
          <span className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_12px_28px_rgba(0,0,0,0.3)] sm:h-14 sm:w-14">
            <Image
              src={BRAND_LOGO}
              alt="Tiger Store"
              fill
              sizes="56px"
              className="object-cover object-left"
              priority
            />
          </span>
          <span className="hidden leading-tight min-[380px]:block">
            <span className="block text-lg font-black text-white">Tiger Store</span>
            <span className="block text-xs font-black text-tiger-gold">digitaldz.shop</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Main navigation" dir="rtl">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-black text-white/78 transition-colors duration-150 hover:bg-white/8 hover:text-tiger-gold"
            >
              {locale === "ar" ? item.ar : item.en}
            </Link>
          ))}
        </nav>

        <form action="/shop" className="hidden w-[300px] items-center rounded-full border border-white/12 bg-black/35 px-2 py-1.5 lg:flex" dir="ltr">
          <input
            name="q"
            placeholder={locale === "ar" ? "ابحث عن اشتراك..." : "Search subscriptions..."}
            className="min-h-9 flex-1 bg-transparent px-2 text-sm font-semibold text-white outline-none placeholder:text-white/42"
          />
          <button
            type="submit"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-tiger-ember text-black transition-colors duration-150 hover:bg-tiger-gold"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <IconLink href="/admin/login" label="Admin login" className="hidden sm:inline-flex">
            <UserRound className="h-5 w-5" />
          </IconLink>
          <IconLink href="/wishlist" label="Wishlist" count={wishlistCount}>
            <Heart className="h-5 w-5" />
          </IconLink>
          <IconLink href="/cart" label="Cart" count={cartCount}>
            <ShoppingCart className="h-5 w-5" />
          </IconLink>
          <button
            type="button"
            onClick={toggleLocale}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/6 px-2 text-xs font-black text-white/84 transition-colors duration-150 hover:bg-white/10 sm:px-3"
            aria-label="Language switch AR / EN"
          >
            <Globe2 className="hidden h-4 w-4 sm:block" />
            {locale === "ar" ? "EN" : "AR"}
          </button>
          <button
            type="button"
            onClick={toggleCurrency}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/6 px-2 text-xs font-black text-white/84 transition-colors duration-150 hover:bg-white/10 sm:px-3"
            aria-label="Currency switch DZD / USD"
            title="250 DZD = 1 USD"
          >
            <CircleDollarSign className="hidden h-4 w-4 sm:block" />
            {currency}
          </button>
        </div>
      </div>

      <nav className="scrollbar-none flex gap-2 overflow-x-auto border-t border-white/8 px-3 py-2 lg:hidden" aria-label="Mobile navigation" dir="rtl">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-black text-white/82"
          >
            {locale === "ar" ? item.ar : item.en}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function IconLink({ href, label, count, children, className }: { href: string; label: string; count?: number; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn("relative inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors duration-150 hover:bg-white/10 hover:text-tiger-gold", className)}
    >
      {children}
      {count ? (
        <span className="absolute -left-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-tiger-ember px-1 text-[10px] font-black text-black">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
