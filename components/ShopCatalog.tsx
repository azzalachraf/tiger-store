"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { Product } from "@/lib/types";
import { productCategories } from "@/lib/product-localization";
import { useLocale } from "@/lib/useLocale";

export function ShopCatalog({ products, initialCategory = "all" }: { products: Product[]; categories: unknown[]; initialCategory?: string; initialFeatured?: boolean; initialSale?: boolean; initialQuery?: string }) {
  const { locale } = useLocale(); const [category, setCategory] = useState(initialCategory);
  const selected = productCategories.find((item) => item.id === category) ?? productCategories[0];
  const filteredProducts = useMemo(() => selected.matches.length ? products.filter((product) => (selected.matches as readonly string[]).includes(product.category)) : products, [products, selected]);
  const title = locale === "ar" ? "المنتجات" : locale === "fr" ? "Produits" : "Products";
  const empty = locale === "ar" ? "لا توجد منتجات في هذا القسم." : locale === "fr" ? "Aucun produit dans cette catégorie." : "No products in this category.";
  return <main className="store-shell min-h-screen px-3 py-6 sm:px-5 lg:px-8" dir={locale === "ar" ? "rtl" : "ltr"}><div className="mx-auto max-w-[1440px]"><h1 className="text-3xl font-black text-[var(--text)]">{title}</h1><div className="mt-5 flex gap-2 overflow-x-auto pb-2 scrollbar-none">{productCategories.map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors ${selected.id === item.id ? "border-[#FF7300] bg-[#FF7300] text-[#151515]" : "border-[var(--border-color)] bg-[var(--surface)] text-[var(--text)]"}`}>{item[locale]}</button>)}</div><section className="mt-6">{filteredProducts.length ? <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">{filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)}</div> : <p className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-8 text-center font-bold text-[var(--muted-text)]">{empty}</p>}</section></div></main>;
}
