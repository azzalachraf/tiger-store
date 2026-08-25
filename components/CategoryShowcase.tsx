"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Category, Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/useLocale";

type CategoryShowcaseProps = { categories: Category[]; products: Product[]; className?: string };
const entries: { id: string; href: string; en: string; fr: string; ar: string; categories: string[] }[] = [
  { id: "all", href: "/shop", en: "All Products", fr: "Tous les produits", ar: "كل المنتجات", categories: [] },
  { id: "ai", href: "/categories/ai", en: "AI Tools", fr: "Outils IA", ar: "أدوات الذكاء الاصطناعي", categories: ["AI"] },
  { id: "creative", href: "/categories/design", en: "Creative Tools", fr: "Outils créatifs", ar: "أدوات إبداعية", categories: ["Design", "Video Editing"] },
  { id: "development", href: "/categories/developer-tools", en: "Development", fr: "Développement", ar: "التطوير", categories: ["Developer Tools"] },
  { id: "learning", href: "/categories/education", en: "Learning", fr: "Apprentissage", ar: "التعلم", categories: ["Education"] },
  { id: "software", href: "/categories/software", en: "Professional Software", fr: "Logiciels professionnels", ar: "برامج احترافية", categories: ["Architecture", "Software", "VPN"] },
  { id: "social", href: "/categories/social-media", en: "Social & Entertainment", fr: "Social et divertissement", ar: "التواصل والترفيه", categories: ["Social", "Social Media"] },
] as const;

export function CategoryShowcase({ products, className }: CategoryShowcaseProps) {
  const { locale } = useLocale(); const [enhanced, setEnhanced] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setEnhanced(true)); return () => cancelAnimationFrame(id); }, []);
  const cards = useMemo(() => entries.map((entry) => ({ ...entry, products: (entry.categories.length ? products.filter((product) => entry.categories.includes(product.category)) : products).slice(0, 3) || products.slice(0, 3) })), [products]);
  const title = locale === "ar" ? "الأقسام" : locale === "fr" ? "Catégories" : "Categories";
  const heading = locale === "ar" ? "تصفح الأقسام" : locale === "fr" ? "Parcourir les catégories" : "Browse categories";
  return <section className={cn("mx-auto max-w-[1440px] px-3 py-6 sm:px-5 lg:px-8", className)} dir={locale === "ar" ? "rtl" : "ltr"}><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-tiger-gold">{title}</p><h2 className="mt-1 text-xl font-black text-[var(--text)] sm:text-2xl">{heading}</h2></div><Link href="/categories" className="shrink-0 text-sm font-black text-tiger-gold">{locale === "ar" ? "عرض الكل" : locale === "fr" ? "Voir tout" : "View all"}</Link></div><div className="category-list" data-enhanced={enhanced || undefined}>{cards.map((entry, index) => <CategoryCard key={entry.id} entry={entry} products={entry.products} locale={locale} index={index} />)}</div></section>;
}

function CategoryCard({ entry, products, locale, index }: { entry: typeof entries[number]; products: Product[]; locale: "ar" | "en" | "fr"; index: number }) {
  const label = entry[locale];
  return <Link href={entry.href} className="category-card motion-card group" style={{ "--card-index": index } as CSSProperties}><div className="relative mx-auto h-[108px] w-[112px]">{products.map((product, productIndex) => <div key={product.id} className={cn("absolute bottom-2 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--page)]", productIndex === 0 && "left-1/2 z-30 h-[90px] w-[72px] -translate-x-1/2", productIndex === 1 && "left-1 z-20 h-[76px] w-[60px] -rotate-[5deg]", productIndex === 2 && "right-1 z-10 h-[76px] w-[60px] rotate-[5deg]")}><Image src={product.image} alt="" fill sizes="90px" className="object-contain p-0.5" /></div>)}</div><h3 className="mt-2 text-center text-sm font-black leading-5 text-[var(--text)]">{label}</h3></Link>;
}
