"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Search, ChevronDown } from "lucide-react";
import type { Locale } from "@/lib/types";
import { productCategories } from "@/lib/product-localization";
import type { HomeProduct } from "./products";
import { homeCopy } from "./copy";
import styles from "./home.module.css";

export function HomeCatalog({
  products,
  locale,
}: {
  products: HomeProduct[];
  locale: Locale;
}) {
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const c = homeCopy[locale];
  const categories = productCategories.filter(
    (entry) =>
      entry.id === "all" ||
      products.some((product) => product.categoryId === entry.id),
  );
  const filtered = products
    .filter((product) => category === "all" || product.categoryId === category)
    .sort(
      (a, b) =>
        Number(b.available) - Number(a.available) ||
        Number(b.slug === "snapchat-plus") -
          Number(a.slug === "snapchat-plus") ||
        a.startingPrice - b.startingPrice,
    );
  const shown = expanded ? filtered : filtered.slice(0, 8);
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
      <div
        className={styles.filters}
        role="group"
        aria-label={c.catalogEyebrow}
      >
        {categories.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={category === entry.id}
            onClick={() => {
              setCategory(entry.id);
              setExpanded(false);
            }}
          >
            {entry.id === "all" ? c.all : entry[locale]}
          </button>
        ))}
      </div>
      <div className={styles.productGrid}>
        {shown.map((product) => (
          <article key={product.id} className={styles.productCard}>
            <Link
              href={product.href}
              prefetch={false}
              className={styles.productImage}
              aria-label={product.name}
            >
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(min-width: 1200px) 260px, (min-width: 768px) 30vw, 45vw"
                className={styles.artwork}
              />
            </Link>
            <div className={styles.productInfo}>
              <p className={styles.category}>{product.category}</p>
              <h3>
                <Link href={product.href} prefetch={false} dir="auto">
                  {product.name}
                </Link>
              </h3>
              <p className={styles.duration}>{product.duration}</p>
              <p className={styles.price} dir="ltr">
                {product.price}
              </p>
              <span
                className={
                  product.available ? styles.available : styles.unavailable
                }
              >
                {product.available ? c.available : c.unavailable}
              </span>
              <Link href={product.href} prefetch={false} className={styles.productCta}>
                {product.available ? c.plans : c.viewDetails}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
      {!shown.length && <p className={styles.empty}>{c.empty}</p>}
      <div className={styles.catalogBottom}>
        <p aria-live="polite">
          {shown.length} / {filtered.length} {c.showing}
        </p>
        {filtered.length > shown.length && (
          <button
            type="button"
            className={styles.secondary}
            onClick={() => setExpanded(true)}
          >
            {c.more}
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        )}
        <Link href="/shop" className={styles.quietLink}>
          {c.catalogLink}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
