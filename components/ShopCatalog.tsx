import { Search } from "lucide-react";
import { CatalogCard } from "@/components/home/CatalogCard";
import { homeProduct } from "@/components/home/products";
import type { Locale, Product } from "@/lib/types";

export function ShopCatalog({ products, initialQuery = "", locale }: { products: Product[]; initialQuery?: string; locale: Locale }) {
  const cards = products.map((product) => homeProduct(product, locale));
  const title = locale === "ar" ? "المنتجات" : locale === "fr" ? "Produits" : "Products";
  const empty = locale === "ar" ? "ما لقيناش منتجات بهذا البحث." : locale === "fr" ? "Aucun produit ne correspond à cette recherche." : "No products match this search.";
  const resultLabel = locale === "ar" ? `نتائج البحث عن «${initialQuery}»` : locale === "fr" ? `Résultats pour « ${initialQuery} »` : `Search results for “${initialQuery}”`;
  const countLabel = locale === "ar" ? "منتج" : locale === "fr" ? `produit${cards.length === 1 ? "" : "s"}` : `product${cards.length === 1 ? "" : "s"}`;
  const placeholder = locale === "ar" ? "ابحث عن منتج" : locale === "fr" ? "Rechercher un produit" : "Search products";

  return <main className="store-shell min-h-screen px-3 py-6 sm:px-5 lg:px-8" dir={locale === "ar" ? "rtl" : "ltr"}><div className="mx-auto max-w-[1160px]"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black text-[var(--text)]">{initialQuery ? resultLabel : title}</h1>{initialQuery && <p className="mt-1 text-sm font-semibold text-[var(--muted-text)]">{cards.length} {countLabel}</p>}</div><form action="/shop" className="relative w-full sm:w-72"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" /><input name="q" type="search" defaultValue={initialQuery} placeholder={placeholder} className="min-h-11 w-full rounded-full border border-[var(--border-color)] bg-[var(--surface)] py-2 ps-10 pe-4 text-sm font-semibold text-[var(--text)] placeholder:text-[var(--muted-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7300]" /></form></div><section className="mt-6">{cards.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-[22px] sm:gap-x-5 sm:gap-y-[26px] md:grid-cols-3 xl:grid-cols-4">{cards.map((product, index) => <CatalogCard key={product.id} product={product} locale={locale} priority={index < 2} />)}</div> : <p className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-8 text-center font-bold text-[var(--muted-text)]">{empty}</p>}</section></div></main>;
}
