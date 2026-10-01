import { ArrowDown } from "lucide-react";
import type { HomeProduct } from "./products";
import type { Locale } from "@/lib/types";
import { homeCopy } from "./copy";
import { ProductShowcase, type ShowcaseProduct } from "./ProductShowcase";
import styles from "./landing.module.css";

const copy = {
  ar: { title: "اشتراكات تحبّها،", accent: "وخدمة تقدر توثق فيها.", spotlight: "الأكثر مبيعاً", duration: "عام كامل + شهر باطل" },
  en: { title: "Subscriptions you love.", accent: "A store you can trust.", spotlight: "Bestseller", duration: "12 months + 1 month free" },
  fr: { title: "Vos abonnements préférés.", accent: "Votre boutique de confiance.", spotlight: "Le plus vendu", duration: "12 mois + 1 mois offert" },
};
export function ShoppingHero({ products, locale }: { products: HomeProduct[]; locale: Locale }) {
  const c = copy[locale];
  const original = homeCopy[locale];
  const preferred = ["snapchat-plus", "canva-pro", "autodesk"];
  const showcase: ShowcaseProduct[] = ["snapchat-plus", "canva-pro", ...products.filter(p => !preferred.includes(p.slug)).map(p => p.slug), "autodesk"].flatMap(slug => {
    const product = products.find(p => p.slug === slug);
    if (!product) return [];
    const snap = slug === "snapchat-plus";
    return [{ ...product, artwork: product.image,
      displayName: snap ? "Snapchat+" : product.name,
      caption: snap ? c.spotlight : original.spotlight,
      duration: snap ? c.duration : product.duration,
      price: snap ? "2,300 DA" : product.price,
      warranty: snap ? original.snapDescription : undefined }];
  });
  return <section className={styles.shoppingHero} aria-labelledby="hero-title">
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}>TIGER STORE · DIGITAL SUBSCRIPTIONS</p>
      <h1 id="hero-title">{c.title}<br /><span>{c.accent}</span></h1>

      <a href="#subscriptions" className={styles.heroBrowse}>{original.browse}<ArrowDown size={18} aria-hidden="true" /></a>
    </div>
    <ProductShowcase products={showcase} locale={locale} labels={{ offers: original.viewOffers, available: original.available, unavailable: original.unavailable }} />
  </section>;
}
