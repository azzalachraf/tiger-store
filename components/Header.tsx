"use client";

import Image from "next/image";
import Link from "next/link";
import { Globe2, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/useLocale";
import { useTheme } from "@/lib/useTheme";

const links = [["/shop", "shop"], ["/payment-methods", "payment"], ["/faq", "faq"], ["/contact", "support"]] as const;

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const ThemeIcon = theme === "dark" ? Moon : Sun;


  return <header className="sticky top-0 z-50 border-b border-[var(--border-color)] bg-[var(--surface)] text-[var(--text)] shadow-sm">
    <div className="mx-auto flex min-h-16 max-w-[1180px] items-center gap-2 px-4 sm:px-6 lg:min-h-[72px] lg:px-8">
      <Link href="/" className="relative h-10 w-24 shrink-0 sm:w-28" aria-label="Tiger Store"><Image src="/logo/tiger-store-ui.png" alt="Tiger Store" fill sizes="112px" className="object-contain object-start" priority /></Link>
      <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label={t(locale, "menu")}>{links.map(([href, key]) => <Link key={href} href={href} className="rounded-full px-3 py-2 text-sm font-bold hover:bg-[#FFF2E6] hover:text-[#C54E00]">{t(locale, key)}</Link>)}</nav>
      <form action="/shop" className="relative hidden w-44 lg:block xl:w-56"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" /><input name="q" type="search" placeholder={t(locale, "search")} className="h-10 w-full rounded-full border border-[var(--border-color)] bg-[var(--page)] py-2 ps-9 pe-3 text-xs font-semibold text-[var(--text)] placeholder:text-[var(--muted-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7300]" /></form>
      <div className="ms-auto flex items-center gap-1">
        <div className="relative"><button type="button" onClick={() => setLanguageOpen((value) => !value)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)]" aria-label={t(locale, "language")} aria-expanded={languageOpen}><Globe2 className="h-4 w-4" /></button>{languageOpen && <LanguageMenu locale={locale} setLocale={setLocale} close={() => setLanguageOpen(false)} />}</div>
        <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)]" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}><ThemeIcon className="h-4 w-4" /></button>
        <button type="button" onClick={() => setMenuOpen((value) => !value)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] lg:hidden" aria-label={t(locale, "menu")} aria-expanded={menuOpen}>{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
    </div>
    {menuOpen && <nav className="border-t border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 lg:hidden" aria-label={t(locale, "menu")}><div className="mx-auto max-w-[1180px]"><form action="/shop" className="relative mb-3"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" /><input name="q" type="search" placeholder={t(locale, "search")} className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--page)] py-2 ps-10 pe-3 text-sm font-semibold text-[var(--text)] placeholder:text-[var(--muted-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7300]" /></form><div className="grid grid-cols-2 gap-2">{links.map(([href, key]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl bg-[var(--page)] px-3 py-3 text-sm font-bold">{t(locale, key)}</Link>)}</div></div></nav>}
  </header>;
}

function LanguageMenu({ locale, setLocale, close }: { locale: ReturnType<typeof useLocale>["locale"]; setLocale: ReturnType<typeof useLocale>["setLocale"]; close: () => void }) {
  return <div className="absolute end-0 top-12 z-[60] w-24 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-1 shadow-lg" role="menu" aria-label={t(locale, "language")}>{([["ar", "ع"], ["fr", "FR"], ["en", "EN"]] as const).map(([value, label]) => <button key={value} type="button" role="menuitem" aria-label={value === "ar" ? "العربية" : value === "fr" ? "Français" : "English"} onClick={() => { setLocale(value); close(); }} className={`block w-full rounded-lg px-3 py-2 text-center text-sm font-bold ${locale === value ? "bg-[#FFF1E6] text-[#C54E00]" : "hover:bg-[var(--page)]"}`}>{label}</button>)}</div>;
}
