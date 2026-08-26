"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, type CSSProperties } from "react";
import { type Category, type Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/useLocale";

type CategoryShowcaseProps = { categories: Category[]; products: Product[]; className?: string };
const entries = [
  { id: "all", href: "/shop", en: "All products", fr: "Tous les produits", ar: "كل المنتجات", categories: [] },
  { id: "ai", href: "/categories/ai", en: "AI tools", fr: "Outils IA", ar: "أدوات الذكاء الاصطناعي", categories: ["AI"] },
  { id: "creative", href: "/categories/design", en: "Creative tools", fr: "Outils créatifs", ar: "أدوات إبداعية", categories: ["Design", "Video Editing"] },
  { id: "development", href: "/categories/developer-tools", en: "Development", fr: "Développement", ar: "التطوير", categories: ["Developer Tools"] },
  { id: "learning", href: "/categories/education", en: "Learning", fr: "Apprentissage", ar: "التعلّم", categories: ["Education"] },
  { id: "software", href: "/categories/software", en: "Professional software", fr: "Logiciels professionnels", ar: "برامج احترافية", categories: ["Architecture", "Software", "VPN"] },
  { id: "social", href: "/categories/social-media", en: "Social & entertainment", fr: "Social et divertissement", ar: "التواصل والترفيه", categories: ["Social", "Social Media"] },
] as const;

export function CategoryShowcase({ products, className }: CategoryShowcaseProps) {
  const { locale } = useLocale(); const cards = useMemo(() => entries.map((entry) => ({ ...entry, products: (entry.categories.length ? products.filter((product) => entry.categories.includes(product.category as never)) : products).slice(0, 3) || products.slice(0, 3) })), [products]);
  const content = locale === "ar" ? { kicker: "الأقسام", title: "تصفح الأقسام", all: "عرض الكل" } : locale === "fr" ? { kicker: "Catégories", title: "Parcourir les catégories", all: "Voir tout" } : { kicker: "Categories", title: "Browse categories", all: "View all" };
  return <section className={cn("mx-auto max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8", className)}><div className="mb-4 flex items-end justify-between gap-3"><div><p className="section-kicker">{content.kicker}</p><h2 className="mt-1 text-xl font-black text-[var(--text)] sm:text-2xl">{content.title}</h2></div><Link href="/categories" className="shrink-0 text-sm font-black text-tiger-gold">{content.all}</Link></div><div className="category-list">{cards.map((entry, index) => <CategoryCard key={entry.id} entry={entry} products={entry.products} locale={locale} index={index} />)}</div></section>;
}

function CategoryCard({ entry, products, locale, index }: { entry: typeof entries[number]; products: Product[]; locale: "ar" | "en" | "fr"; index: number }) {
  return <Link href={entry.href} className="category-card group" style={{ "--card-index": index } as CSSProperties}><div className="relative mx-auto h-[88px] w-[96px]">{products.map((product, productIndex) => <div key={product.id} className={cn("absolute bottom-1 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--page)]", productIndex === 0 && "left-1/2 z-30 h-[76px] w-[60px] -translate-x-1/2", productIndex === 1 && "left-0 z-20 h-[64px] w-[50px] -rotate-[5deg]", productIndex === 2 && "right-0 z-10 h-[64px] w-[50px] rotate-[5deg]")}><Image src={product.image} alt="" fill sizes="76px" className="object-contain p-0.5" /></div>)}</div><h3 className="mt-2 text-center text-sm font-black leading-5 text-[var(--text)]">{entry[locale]}</h3></Link>;
}
