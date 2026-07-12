"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ListFilter, Search, SlidersHorizontal } from "lucide-react";
import { CategoryShowcase } from "@/components/CategoryShowcase";
import { ProductCard } from "@/components/ProductCard";
import { Category, Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/useLocale";

type SortMode = "featured" | "price-asc" | "price-desc" | "name";

type ShopCatalogProps = {
  products: Product[];
  categories: Category[];
  initialCategory?: string;
  initialFeatured?: boolean;
  initialSale?: boolean;
  initialQuery?: string;
};

export function ShopCatalog({
  products,
  categories,
  initialCategory = "all",
  initialFeatured = false,
  initialSale = false,
  initialQuery = "",
}: ShopCatalogProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<SortMode>("featured");
  const [featuredOnly, setFeaturedOnly] = useState(initialFeatured);
  const [saleOnly, setSaleOnly] = useState(initialSale);
  const [availableOnly, setAvailableOnly] = useState(false);
  const { locale } = useLocale();
  const labels = locale === "ar"
    ? {
        home: "الرئيسية",
        shop: "المتجر",
        products: "منتج",
        filter: "تصفية المنتجات",
        search: "ابحث عن اشتراك...",
        all: "الكل",
        featured: "مختارة",
        sale: "عروض",
        available: "متوفر",
        sortBy: "ترتيب حسب",
        defaultSort: "الأكثر مناسبة",
        priceAsc: "السعر: من الأقل للأعلى",
        priceDesc: "السعر: من الأعلى للأقل",
        name: "الاسم",
        showing: "عدد النتائج",
        category: "القسم",
        saleOnly: "العروض فقط",
        empty: "لا توجد منتجات تطابق الفلاتر الحالية.",
        headline: "كل الاشتراكات الرقمية",
        intro: "اختر القسم أو ابحث باسم المنتج. الأسعار بالدينار والتفعيل يختلف حسب نوع الاشتراك.",
      }
    : {
        home: "Home",
        shop: "Shop",
        products: "products",
        filter: "Filter products",
        search: "Search subscriptions...",
        all: "All",
        featured: "Featured",
        sale: "Deals",
        available: "Available",
        sortBy: "Sort by",
        defaultSort: "Best match",
        priceAsc: "Price: low to high",
        priceDesc: "Price: high to low",
        name: "Name",
        showing: "Showing",
        category: "Category",
        saleOnly: "Deals only",
        empty: "No products match the current filters.",
        headline: "All digital subscriptions",
        intro: "Choose a category or search by product name. Prices are shown in DZD and activation depends on subscription type.",
      };

  const filteredProducts = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return products
      .filter((product) => {
        const matchesSearch =
          !cleanQuery ||
          product.name.toLowerCase().includes(cleanQuery) ||
          product.nameAr.toLowerCase().includes(cleanQuery);
        const matchesCategory = category === "all" || product.category === category;
        const matchesFeatured = !featuredOnly || product.featured;
        const matchesSale = !saleOnly || Boolean(product.oldPrice && product.oldPrice > product.price);
        const matchesAvailability = !availableOnly || product.available;

        return matchesSearch && matchesCategory && matchesFeatured && matchesSale && matchesAvailability;
      })
      .sort((a, b) => {
        if (sort === "price-asc") return a.price - b.price;
        if (sort === "price-desc") return b.price - a.price;
        if (sort === "name") return a.name.localeCompare(b.name);
        return Number(b.featured) - Number(a.featured) || a.price - b.price;
      });
  }, [availableOnly, category, featuredOnly, products, query, saleOnly, sort]);

  return (
    <div className="store-shell min-h-screen" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="mx-auto max-w-[1440px] px-3 pt-5 sm:px-5 lg:px-8">
        <div className="premium-card rounded-md p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 text-sm font-bold text-white/60">
            <div>
              <Link href="/" className="hover:text-tiger-gold">{labels.home}</Link>
              <span className="mx-2">/</span>
              <span className="text-white">{labels.shop}</span>
            </div>
            <p>{filteredProducts.length} {labels.products}</p>
          </div>
          <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">{labels.headline}</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-white/60">{labels.intro}</p>
        </div>
      </section>

      <CategoryShowcase categories={categories} products={products} className="pb-3 pt-5" />

      <section className="mx-auto max-w-[1440px] px-3 pb-10 pt-2 sm:px-5 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="premium-card h-fit rounded-md p-4 lg:sticky lg:top-28">
            <div className="mb-4 flex items-center gap-2">
              <ListFilter className="h-5 w-5 text-tiger-ember" />
              <h2 className="font-black text-white">{labels.filter}</h2>
            </div>

            <label className="relative block">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.search}
                className="min-h-11 w-full rounded-full border border-white/10 bg-black/35 px-11 py-2.5 text-white outline-none placeholder:text-white/35 focus:border-tiger-ember"
              />
            </label>

            <div className="mt-4 grid gap-2">
              {categories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={cn(
                    "flex min-h-10 items-center justify-between rounded-md border px-3 text-sm font-bold transition-colors duration-150",
                    category === item.id
                      ? "border-tiger-ember bg-tiger-ember text-black"
                      : "border-white/10 bg-black/24 text-white/70 hover:bg-white/8",
                  )}
                >
                  <span>{item.id === "all" ? labels.all : locale === "ar" ? item.name.ar : item.name.en}</span>
                  {item.id !== "all" ? <span className="text-xs">{locale === "ar" ? item.name.en : item.name.ar}</span> : null}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <FilterToggle active={featuredOnly} onClick={() => setFeaturedOnly((value) => !value)}>
                {labels.featured}
              </FilterToggle>
              <FilterToggle active={saleOnly} onClick={() => setSaleOnly((value) => !value)}>
                {labels.sale}
              </FilterToggle>
              <FilterToggle active={availableOnly} onClick={() => setAvailableOnly((value) => !value)}>
                {labels.available}
              </FilterToggle>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-tiger-gold">{locale === "ar" ? "المتجر" : "Shop"}</p>
                <h2 className="mt-1 text-2xl font-black text-white">{labels.shop}</h2>
              </div>

              <label className="relative inline-flex min-h-12 items-center gap-2 rounded-full border border-tiger-ember/25 bg-[linear-gradient(135deg,rgba(255,106,0,0.16),rgba(255,255,255,0.045))] px-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)]">
                <SlidersHorizontal className="h-4 w-4 text-tiger-gold" />
                <span className="hidden text-xs font-black text-white/60 sm:inline">{labels.sortBy}</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  className="min-h-10 appearance-none bg-transparent pe-7 ps-1 text-sm font-black text-white outline-none"
                >
                  <option value="featured">{labels.defaultSort}</option>
                  <option value="price-asc">{labels.priceAsc}</option>
                  <option value="price-desc">{labels.priceDesc}</option>
                  <option value="name">{labels.name}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute end-4 h-4 w-4 text-tiger-gold" />
              </label>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-white/8 bg-[#181818] px-3 py-2 text-xs font-bold text-white/58">
              <SlidersHorizontal className="h-4 w-4 text-tiger-ember" />
              <span>{labels.showing}: {filteredProducts.length}</span>
              {category !== "all" ? <span className="text-tiger-gold">{labels.category}: {category}</span> : null}
              {saleOnly ? <span className="text-tiger-gold">{labels.saleOnly}</span> : null}
            </div>

            {filteredProducts.length ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 4} />
                ))}
              </div>
            ) : (
              <div className="premium-card rounded-md p-8 text-center text-white/65">
                {labels.empty}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-full border px-3 text-xs font-black transition-colors duration-150",
        active
          ? "border-tiger-ember bg-tiger-ember text-black"
          : "border-white/10 bg-black/24 text-white/70 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}
