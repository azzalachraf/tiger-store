"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Clock3, Globe2, Headphones, Menu, Moon, ReceiptText, Search, ShoppingCart, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { readCart } from "@/lib/cart";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/useLocale";
import { useTheme } from "@/lib/useTheme";

const links = [["/shop", "shop"], ["/categories", "categories"], ["/payment-methods", "payment"], ["/faq", "faq"], ["/contact", "support"]] as const;

const reassuranceItems = {
  ar: [
    [ReceiptText, "تحويل يدوي فقط"],
    [BadgeCheck, "وصل الدفع إلزامي"],
    [Clock3, "التفعيل بعد تأكيد الدفع"],
    [Headphones, "متابعة الطلب والدعم"],
  ],
  en: [
    [ReceiptText, "Manual transfer only"],
    [BadgeCheck, "Receipt upload is required"],
    [Clock3, "Activation after payment verification"],
    [Headphones, "Order follow-up and support"],
  ],
  fr: [
    [ReceiptText, "Virement manuel uniquement"],
    [BadgeCheck, "Reçu de paiement obligatoire"],
    [Clock3, "Activation après vérification du paiement"],
    [Headphones, "Suivi de commande et assistance"],
  ],
} as const;

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const ThemeIcon = theme === "dark" ? Moon : Sun;

  useEffect(() => {
    const update = () => setCartCount(readCart().reduce((total, item) => total + item.quantity, 0));
    update();
    window.addEventListener("tiger-store-cart-updated", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("tiger-store-cart-updated", update); window.removeEventListener("storage", update); };
  }, []);

  return <header className="sticky top-0 z-50 border-b border-[var(--border-color)] bg-[var(--surface)]/95 text-[var(--text)] backdrop-blur">
    <div className="border-b border-white/10 bg-[#211914] text-[#FFF8F1]" aria-label={locale === "ar" ? "معلومات الطلب" : "Ordering information"}>
      <div className="order-strip" role="presentation">
        <div className="order-strip__track">
          {[...reassuranceItems[locale], ...reassuranceItems[locale]].map(([Icon, label], index) => <span key={`${label}-${index}`} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap"><Icon className="h-4 w-4 text-[#FF9A4A]" aria-hidden="true" />{label}</span>)}
        </div>
      </div>
    </div>
    <div className="mx-auto flex min-h-16 max-w-[1180px] items-center gap-2 px-4 sm:px-6 lg:min-h-[72px] lg:px-8">
      <Link href="/" className="relative h-10 w-24 shrink-0 sm:w-28" aria-label="Tiger Store"><Image src="/logo/tiger-store-ui.png" alt="Tiger Store" fill sizes="112px" className="object-contain object-start" priority /></Link>
      <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label={t(locale, "menu")}>{links.map(([href, key]) => <Link key={href} href={href} className="rounded-full px-3 py-2 text-sm font-bold hover:bg-[#FFF2E6] hover:text-[#C54E00]">{t(locale, key)}</Link>)}</nav>
      <form action="/shop" className="relative hidden w-44 lg:block xl:w-56"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" /><input name="q" type="search" placeholder={t(locale, "search")} className="h-10 w-full rounded-full border border-[var(--border-color)] bg-[var(--page)] py-2 ps-9 pe-3 text-xs font-semibold text-[var(--text)] placeholder:text-[var(--muted-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7300]" /></form>
      <div className="ms-auto flex items-center gap-1">
        <div className="relative"><button type="button" onClick={() => setLanguageOpen((value) => !value)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)]" aria-label={t(locale, "language")} aria-expanded={languageOpen}><Globe2 className="h-4 w-4" /></button>{languageOpen && <LanguageMenu locale={locale} setLocale={setLocale} close={() => setLanguageOpen(false)} />}</div>
        <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)]" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}><ThemeIcon className="h-4 w-4" /></button>
        <Link href="/cart" className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)]" aria-label={t(locale, "cart")}><ShoppingCart className="h-5 w-5" />{cartCount > 0 && <span className="absolute -end-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF7300] px-1 text-[10px] font-black text-[#17120F]">{cartCount}</span>}</Link>
        <button type="button" onClick={() => setMenuOpen((value) => !value)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] lg:hidden" aria-label={t(locale, "menu")} aria-expanded={menuOpen}>{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
    </div>
    {menuOpen && <nav className="border-t border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 lg:hidden" aria-label={t(locale, "menu")}><div className="mx-auto max-w-[1180px]"><form action="/shop" className="relative mb-3"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" /><input name="q" type="search" placeholder={t(locale, "search")} className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--page)] py-2 ps-10 pe-3 text-sm font-semibold text-[var(--text)] placeholder:text-[var(--muted-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7300]" /></form><div className="grid grid-cols-2 gap-2">{links.map(([href, key]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl bg-[var(--page)] px-3 py-3 text-sm font-bold">{t(locale, key)}</Link>)}</div></div></nav>}
  </header>;
}

function LanguageMenu({ locale, setLocale, close }: { locale: ReturnType<typeof useLocale>["locale"]; setLocale: ReturnType<typeof useLocale>["setLocale"]; close: () => void }) {
  return <div className="absolute end-0 top-12 z-[60] w-20 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-1 shadow-lg" role="menu" aria-label={t(locale, "language")}>{([["ar", "ع"], ["en", "EN"]] as const).map(([value, label]) => <button key={value} type="button" role="menuitem" aria-label={value === "ar" ? "العربية" : "English"} onClick={() => { setLocale(value); close(); }} className={`block w-full rounded-lg px-3 py-2 text-center text-sm font-bold ${locale === value ? "bg-[#FFF1E6] text-[#C54E00]" : "hover:bg-[var(--page)]"}`}>{label}</button>)}</div>;
}
