import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Clock3, Headphones, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/types";
import type { HomeProduct } from "./products";
import styles from "./landing.module.css";

const featureCopy = {
  ar: [
    ["دفع موثوق", ShieldCheck],
    ["أسعار واضحة بالدينار", BadgeCheck],
    ["تفعيل من 15 دقيقة إلى 12 ساعة", Clock3],
    ["دعم مباشر قبل وبعد الطلب", Headphones],
  ],
  fr: [
    ["Paiement fiable", ShieldCheck],
    ["Prix clairs en dinars", BadgeCheck],
    ["Activation de 15 min à 12 h", Clock3],
    ["Assistance avant et après l’achat", Headphones],
  ],
  en: [
    ["Trusted payment", ShieldCheck],
    ["Clear prices in dinars", BadgeCheck],
    ["Activation in 15 minutes–12 hours", Clock3],
    ["Support before and after ordering", Headphones],
  ],
} as const;

function FeatureItems({ locale, hidden = false }: { locale: Locale; hidden?: boolean }) {
  return (
    <div className={styles.marqueeSet} aria-hidden={hidden || undefined}>
      {featureCopy[locale].map(([label, Icon]) => (
        <span className={styles.featureItem} dir={locale === "ar" ? "rtl" : "ltr"} key={label}>
          <Icon size={17} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

function ProductItems({ products, hidden = false }: { products: HomeProduct[]; hidden?: boolean }) {
  return (
    <div className={styles.marqueeSet} aria-hidden={hidden || undefined}>
      {products.map((product) => (
        <Link href={product.href} prefetch={false} className={styles.movingProduct} key={product.id} tabIndex={hidden ? -1 : undefined}>
          <span className={styles.movingProductImage}>
            <Image src={product.image} alt="" fill sizes="64px" loading="lazy" className={styles.artwork} />
          </span>
          <span className={styles.movingProductCopy} dir="auto">
            <strong>{product.name}</strong>
            <small dir="ltr">{product.price}</small>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function FeatureStrip({ locale }: { locale: Locale }) {
  return (
    <aside className={styles.featureStrip} aria-label={locale === "ar" ? "مميزات المتجر" : locale === "fr" ? "Avantages de la boutique" : "Store features"}>
      <div className={`${styles.marqueeTrack} ${styles.featureTrack}`}>
        <FeatureItems locale={locale} />
        <FeatureItems locale={locale} hidden />
      </div>
    </aside>
  );
}

export function MovingCatalog({ products, locale }: { products: HomeProduct[]; locale: Locale }) {
  const categories = Array.from(
    products.reduce((items, product) => {
      if (!items.has(product.categoryId)) items.set(product.categoryId, product);
      return items;
    }, new Map<string, HomeProduct>()),
  ).map(([, product]) => product);
  const movingProducts = products.filter((product) => product.available).slice(0, 10);

  return (
    <section className={styles.motionShowcase} aria-label={locale === "ar" ? "استكشف المنتجات والتصنيفات" : locale === "fr" ? "Découvrir les produits et catégories" : "Explore products and categories"}>
      <div className={styles.categoryRail}>
        <div className={`${styles.marqueeTrack} ${styles.categoryTrack}`}>
          {[false, true].map((hidden) => (
            <div className={styles.marqueeSet} aria-hidden={hidden || undefined} key={String(hidden)}>
              {categories.map((category) => (
                <Link
                  href={`/shop?category=${encodeURIComponent(category.categoryId)}`}
                  prefetch={false}
                  className={styles.categoryPill}
                  tabIndex={hidden ? -1 : undefined}
                  key={category.categoryId}
                >
                  <span className={styles.categoryThumb}>
                    <Image src={category.image} alt="" fill sizes="42px" loading="lazy" className={styles.artwork} />
                  </span>
                  <span dir="auto">{category.category}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.productRail}>
        <div className={`${styles.marqueeTrack} ${styles.productTrack}`}>
          <ProductItems products={movingProducts} />
          <ProductItems products={movingProducts} hidden />
        </div>
      </div>
    </section>
  );
}
