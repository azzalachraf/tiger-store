"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { homeProduct } from "@/components/home/products";
import styles from "@/components/home/landing.module.css";
import { t } from "@/lib/i18n";
import type { Product } from "@/lib/types";
import { useLocale } from "@/lib/useLocale";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { locale } = useLocale();
  const card = homeProduct(product, locale);
  const action = card.available
    ? locale === "ar" ? "اطلب الآن" : locale === "fr" ? "Commander" : "Shop now"
    : locale === "ar" ? "غير متوفر" : locale === "fr" ? "Indisponible" : "Unavailable";

  return (
    <article className={`${styles.productCard} ${styles.catalogCardScope}`}>
      <Link
        href={card.href}
        prefetch={false}
        className={styles.productImage}
        aria-label={`${t(locale, "viewProduct")}: ${card.name}`}
      >
        <Image
          src={card.image}
          alt={`${card.name} — ${t(locale, "productArtwork")}`}
          fill
          sizes="(min-width: 1280px) 23vw, (min-width: 768px) 31vw, 50vw"
          className={styles.artwork}
          priority={priority}
          loading={priority ? undefined : "lazy"}
        />
      </Link>
      <div className={styles.productInfo}>
        <h3>
          <Link href={card.href} prefetch={false} dir="auto">
            {card.name}
          </Link>
        </h3>
        <p className={styles.duration}>{card.duration}</p>
        <p className={styles.price} dir="ltr">{card.price}</p>
        {!card.available && <span className={styles.unavailable}>{t(locale, "outOfStock")}</span>}
        <Link href={card.href} prefetch={false} className={styles.cardCta}>
          {action}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
