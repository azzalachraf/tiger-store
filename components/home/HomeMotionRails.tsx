import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Clock3, Headphones, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/types";
import type { HomeProduct } from "./products";
import styles from "./landing.module.css";

const featureCopy = {
  ar: [
    ["طلب بدون حساب", ShieldCheck],
    ["أسعار واضحة بالدينار", BadgeCheck],
    ["تفعيل بعد التحقق من الدفع", Clock3],
    ["دعم مباشر قبل وبعد الطلب", Headphones],
  ],
  fr: [
    ["Commande sans compte", ShieldCheck],
    ["Prix clairs en dinars", BadgeCheck],
    ["Activation après vérification", Clock3],
    ["Assistance avant et après l’achat", Headphones],
  ],
  en: [
    ["No account needed", ShieldCheck],
    ["Clear prices in dinars", BadgeCheck],
    ["Activation after payment verification", Clock3],
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

export function FeatureStrip({ locale }: { locale: Locale }) {
  return (
    <aside className={styles.featureStrip} aria-label={locale === "ar" ? "مميزات المتجر" : locale === "fr" ? "Avantages de la boutique" : "Store features"}>
      <label className={styles.motionControl}><input type="checkbox" />{locale === "ar" ? "إيقاف الحركة" : locale === "fr" ? "Pause" : "Pause motion"}</label>
      <div className={`${styles.marqueeTrack} ${styles.featureTrack}`}>
        <FeatureItems locale={locale} />
        <FeatureItems locale={locale} hidden />
      </div>
    </aside>
  );
}

export function CategoryRail({ products, locale }: { products: HomeProduct[]; locale: Locale }) {
  const categories = Array.from(
    products.reduce((items, product) => {
      if (!items.has(product.categoryId)) items.set(product.categoryId, product);
      return items;
    }, new Map<string, HomeProduct>()),
  ).map(([, product]) => product);

  return (
    <section className={styles.catalogCategories} aria-label={locale === "ar" ? "استكشف المنتجات والتصنيفات" : locale === "fr" ? "Découvrir les produits et catégories" : "Explore products and categories"}>
      <div className={styles.categoryRail}>
        <div className={`${styles.marqueeTrack} ${styles.categoryTrack}`}>
          {[false].map((hidden) => (
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
    </section>
  );
}
