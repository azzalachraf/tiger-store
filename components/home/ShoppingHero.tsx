import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { HomeProduct } from "./products";
import type { Locale } from "@/lib/types";
import { homeCopy } from "./copy";
import styles from "./landing.module.css";

const copy = {
  ar: { title: "اشتراكات تحبّها،", accent: "وخدمة تقدر توثق فيها.", spotlight: "الأكثر مبيعاً", duration: "عام كامل + شهر باطل" },
  en: { title: "Subscriptions you love.", accent: "A store you can trust.", spotlight: "Bestseller", duration: "12 months + 1 month free" },
  fr: { title: "Vos abonnements préférés.", accent: "Votre boutique de confiance.", spotlight: "Le plus vendu", duration: "12 mois + 1 mois offert" },
};
export function ShoppingHero({ products, locale }: { products: HomeProduct[]; locale: Locale }) {
  const c = copy[locale];
  const original = homeCopy[locale];
  const featured = products.find(p => p.slug === "snapchat-plus" && p.available) ?? products.find(p => p.available) ?? products[0];
  const isSnapchat = featured?.slug === "snapchat-plus";
  const satellites = products.filter(p => p.available && p.id !== featured?.id).slice(0, 2);
  return <section className={styles.shoppingHero} aria-labelledby="hero-title">
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}>TIGER STORE · DIGITAL SUBSCRIPTIONS</p>
      <h1 id="hero-title">{c.title}<br /><span>{c.accent}</span></h1>

      <a href="#subscriptions" className={styles.heroBrowse}>{original.browse}<ArrowDown size={18} aria-hidden="true" /></a>
    </div>
    {featured && <article className={styles.heroOffer}>
      <div className={styles.heroStage} aria-hidden="true">
        <span className={styles.stageOrbit} />
        {satellites.map((p, i) => <div className={i === 0 ? styles.stageLeft : styles.stageRight} key={p.id}><Image src={p.image} alt="" fill sizes="80px" className={styles.artwork} /></div>)}
        <div className={styles.stageMain}><Image src={featured.image} alt="" fill priority sizes="(min-width:768px) 220px, 125px" className={styles.artwork} /></div>
      </div>
      <div className={styles.heroOfferCopy}>
        <p className={styles.offerKicker}>{isSnapchat ? c.spotlight : original.spotlight}</p>
        <h2 dir="auto">{isSnapchat ? "Snapchat+" : featured.name}</h2>
        <p className={styles.offerDuration}>{isSnapchat ? c.duration : featured.duration}</p>
        <strong className={styles.offerPrice} dir="ltr">{isSnapchat ? "2,300 DA" : featured.price}</strong>
        {isSnapchat && <p className={styles.offerWarranty}>{original.snapDescription}</p>}
        <span className={styles.offerAvailability}>{featured.available ? original.available : original.unavailable}</span>
        <Link href={featured.href} prefetch={false} className={styles.offerButton}>{original.viewOffers}<ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    </article>}
  </section>;
}
