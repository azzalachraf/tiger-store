import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check } from "lucide-react";
import type { HomeProduct } from "./products";
import type { Locale } from "@/lib/types";
import styles from "./landing.module.css";

const copy = {
  ar: { title: "اشتراكك المفضّل.", accent: "بخطوات بسيطة.", intro: "اختر اشتراكك، شوف السعر والمدة، واطلب مباشرة بدون حساب.", browse: "تصفّح كل المنتجات", offer: "اختر خطتك", spotlight: "اكتشف الاشتراك", guest: "بدون إنشاء حساب", prices: "أسعار بالدينار", payment: "BaridiMob · Binance · RedotPay", pause: "إيقاف الحركة", note: "التفعيل عادةً خلال 15 دقيقة–12 ساعة بعد التحقق من الدفع." },
  en: { title: "Your favourite subscriptions.", accent: "A few simple steps.", intro: "Choose your subscription, check the price and duration, and order without an account.", browse: "Explore all products", offer: "Choose your plan", spotlight: "Explore this subscription", guest: "No account needed", prices: "Prices in dinars", payment: "BaridiMob · Binance · RedotPay", pause: "Pause motion", note: "Activation usually takes 15 minutes–12 hours after payment verification." },
  fr: { title: "Vos abonnements préférés.", accent: "En quelques étapes.", intro: "Choisissez un abonnement, consultez le prix et la durée, puis commandez sans compte.", browse: "Voir tous les produits", offer: "Choisir ma formule", spotlight: "Découvrez cet abonnement", guest: "Sans créer de compte", prices: "Prix en dinars", payment: "BaridiMob · Binance · RedotPay", pause: "Arrêter les animations", note: "Activation généralement sous 15 min–12 h après vérification du paiement." },
};

export function ShoppingHero({ products, locale }: { products: HomeProduct[]; locale: Locale }) {
  const c = copy[locale];
  const featured = products.find(p => p.slug === "snapchat-plus" && p.available) ?? products.find(p => p.available) ?? products[0];
  const satellites = products.filter(p => p.available && p.id !== featured?.id).slice(0, 2);
  return <section className={styles.shoppingHero} aria-labelledby="hero-title">
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}>TIGER STORE / DIGITAL</p>
      <h1 id="hero-title">{c.title}<br /><span>{c.accent}</span></h1>
      <p className={styles.heroIntro}>{c.intro}</p>
      <a href="#subscriptions" className={styles.heroBrowse}>{c.browse}<ArrowDown size={18} aria-hidden="true" /></a>
      <div className={styles.heroReassurance}><span><Check size={14} />{c.guest}</span><span><Check size={14} />{c.prices}</span></div>
    </div>
    {featured && <article className={styles.heroOffer}>
      <div className={styles.heroStage} aria-hidden="true">
        <span className={styles.stageOrbit} />
        {satellites.map((p, i) => <div className={i === 0 ? styles.stageLeft : styles.stageRight} key={p.id}><Image src={p.image} alt="" fill sizes="80px" className={styles.artwork} /></div>)}
        <div className={styles.stageMain}><Image src={featured.image} alt="" fill priority sizes="(min-width:768px) 220px, 125px" className={styles.artwork} /></div>
      </div>
      <div className={styles.heroOfferCopy}>
        <p className={styles.offerKicker}>{c.spotlight}</p>
        <h2 dir="auto">{featured.name}</h2>
        <p className={styles.offerDuration}>{featured.duration}</p>
        <strong className={styles.offerPrice} dir="ltr">{featured.price}</strong>
        <Link href={featured.href} prefetch={false} className={styles.offerButton}>{c.offer}<ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    </article>}
    <div className={styles.paymentReassurance}><span dir="ltr">{c.payment}</span><p>{c.note}</p></div>
  </section>;
}
