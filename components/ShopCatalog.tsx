"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { findCatalogProducts } from "@/lib/catalog-search";
import { Product } from "@/lib/types";
import { productCategories } from "@/lib/product-localization";
import { useLocale } from "@/lib/useLocale";

export function ShopCatalog({ products, initialCategory = "all", initialQuery = "" }: { products: Product[]; categories: unknown[]; initialCategory?: string; initialFeatured?: boolean; initialSale?: boolean; initialQuery?: string }) {
  const { locale } = useLocale(); const [category, setCategory] = useState(initialCategory);
  const selected = productCategories.find((item) => item.id === category) ?? productCategories[0];
  const filteredProducts = useMemo(() => { const inCategory = selected.matches.length ? products.filter((product) => (selected.matches as readonly string[]).includes(product.category)) : products; return findCatalogProducts(inCategory, initialQuery); }, [initialQuery, products, selected]);
  const title = locale === "ar" ? "المنتجات" : locale === "fr" ? "Produits" : "Products";
  const empty = initialQuery ? (locale === "ar" ? "ما لقيناش منتجات بهذا البحث." : "No products match this search.") : (locale === "ar" ? "لا توجد منتجات في هذا القسم." : locale === "fr" ? "Aucun produit dans cette catégorie." : "No products in this category.");
  const resultLabel = locale === "ar" ? `نتائج البحث عن “${initialQuery}”` : `Search results for “${initialQuery}”`;
  return <main className="store-shell min-h-screen px-3 py-6 sm:px-5 lg:px-8" dir={locale === "ar" ? "rtl" : "ltr"}><div className="mx-auto max-w-[1440px]"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black text-[var(--text)]">{initialQuery ? resultLabel : title}</h1>{initialQuery && <p className="mt-1 text-sm font-semibold text-[var(--muted-text)]">{filteredProducts.length} {locale === "ar" ? "منتج" : "product"}{filteredProducts.length === 1 && locale !== "ar" ? "" : locale === "en" ? "s" : ""}</p>}</div><form action="/shop" className="relative w-full sm:w-72"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" /><input name="q" type="search" defaultValue={initialQuery} placeholder={locale === "ar" ? "ابحث عن منتج" : "Search products"} className="min-h-11 w-full rounded-full border border-[var(--border-color)] bg-[var(--surface)] py-2 ps-10 pe-4 text-sm font-semibold text-[var(--text)] placeholder:text-[var(--muted-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7300]" /></form></div><div className="mt-5 flex gap-2 overflow-x-auto pb-2 scrollbar-none">{productCategories.map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors ${selected.id === item.id ? "border-[#FF7300] bg-[#FF7300] text-[#151515]" : "border-[var(--border-color)] bg-[var(--surface)] text-[var(--text)]"}`}>{item[locale]}</button>)}</div><section className="mt-6">{filteredProducts.length ? <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">{filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)}</div> : <p className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-8 text-center font-bold text-[var(--muted-text)]">{empty}</p>}</section></div></main>;
}
