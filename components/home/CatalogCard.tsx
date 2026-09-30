import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/lib/types";
import type { HomeProduct } from "./products";
import styles from "./landing.module.css";

export function CatalogCard({
  product,
  locale,
  priority = false,
}: {
  product: HomeProduct;
  locale: Locale;
  priority?: boolean;
}) {
  const action = product.available
    ? locale === "ar"
      ? "اطلب الآن"
      : locale === "fr"
        ? "Commander"
        : "Shop now"
    : locale === "ar"
      ? "غير متوفر"
      : locale === "fr"
        ? "Indisponible"
        : "Unavailable";

  return (
    <article className={`${styles.productCard} ${styles.catalogCardScope}`}>
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
          sizes="(min-width: 1280px) 260px, (min-width: 768px) 31vw, 46vw"
          className={styles.artwork}
          priority={priority}
          loading={priority ? undefined : "lazy"}
        />
      </Link>
      <div className={styles.productInfo}>
        <h3>
          <Link href={product.href} prefetch={false} dir="auto">
            {product.name}
          </Link>
        </h3>
        <p className={styles.duration}>{product.duration}</p>
        <p className={styles.price} dir="ltr">
          {product.price}
        </p>
        {!product.available && (
          <span className={styles.unavailable}>{action}</span>
        )}
        <Link href={product.href} prefetch={false} className={styles.cardCta}>
          {action}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
