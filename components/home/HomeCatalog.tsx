import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import type { Locale } from "@/lib/types";
import type { HomeProduct } from "./products";
import { CategoryRail } from "./HomeMotionRails";
import { CatalogCard } from "./CatalogCard";
import { homeCopy } from "./copy";
import styles from "./landing.module.css";

export function HomeCatalog({
  products,
  locale,
}: {
  products: HomeProduct[];
  locale: Locale;
}) {
  const c = homeCopy[locale];
  const filtered = [...products].sort(
      (a, b) =>
        Number(b.available) - Number(a.available) ||
        Number(b.slug === "snapchat-plus") -
          Number(a.slug === "snapchat-plus") ||
        a.startingPrice - b.startingPrice,
    );
  return (
    <section
      id="subscriptions"
      className={`${styles.container} ${styles.catalog}`}
      aria-labelledby="catalog-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>{c.catalogEyebrow}</p>
          <h2 id="catalog-title">{c.catalogTitle}</h2>
        </div>
        <form action="/shop" className={styles.search} role="search">
          <label className={styles.srOnly} htmlFor="home-search">
            {c.search}
          </label>
          <input
            id="home-search"
            type="search"
            name="q"
            maxLength={80}
            placeholder={c.searchPlaceholder}
          />
          <button type="submit" aria-label={c.search}>
            <Search size={20} aria-hidden="true" />
          </button>
        </form>
      </div>
      <CategoryRail products={products} locale={locale} />
      <div className={styles.productGrid}>
        {filtered.map((product) => (
          <CatalogCard key={product.id} product={product} locale={locale} />
        ))}
      </div>
      {!filtered.length && <p className={styles.empty}>{c.empty}</p>}
      <div className={styles.catalogBottom}>
        <p aria-live="polite">
          {filtered.length} {c.showing}
        </p>
        <Link href="/shop" className={styles.quietLink}>
          {c.catalogLink}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
