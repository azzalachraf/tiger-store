import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowUpRight,
  FileCheck2,
  Instagram,
  MessageCircle,
  Plus,
} from "lucide-react";
import { getProducts, getSettings } from "@/lib/admin-store";
import { createPageMetadata } from "@/lib/seo";
import { Header } from "@/components/Header";
import { HomeCatalog } from "@/components/home/HomeCatalog";
import { homeCopy } from "@/components/home/copy";
import { homeProduct } from "@/components/home/products";
import styles from "@/components/home/landing.module.css";

export const dynamic = "force-dynamic";

async function homeLocale() {
  const saved = (await cookies()).get("tiger-store-locale")?.value;
  return saved === "en" || saved === "fr" ? saved : "ar";
}

export async function generateMetadata() {
  const locale = await homeLocale();
  const c = homeCopy[locale];
  const metadata = createPageMetadata({
    title: c.metaTitle,
    description: c.metaDescription,
    path: "/",
  });
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      locale: { ar: "ar_DZ", fr: "fr_DZ", en: "en_GB" }[locale],
    },
  };
}

export default async function Home() {
  const [products, settings, locale] = await Promise.all([
    getProducts(),
    getSettings(),
    homeLocale(),
  ]);
  const c = homeCopy[locale];
  const annualDuration = locale === "ar" ? "عام كامل + شهر باطل" : locale === "fr" ? "12 mois + 1 mois offert" : "12 months + 1 month free";
  const cards = products.map((product) => {
    const card = homeProduct(product, locale);
    return card;
  });
  const featured = cards.find((product) => product.slug === "snapchat-plus");
  const instagram =
    settings.instagramUrl || "https://www.instagram.com/tiger.store.dz2/";
  const whatsapp = `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "") || "213556974593"}`;
  return (
    <div
      className={styles.home}
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
    >
      <Header />
      <main id="home-main">
        <section className={`${styles.container} ${styles.minimalHero}`} aria-labelledby="hero-title">
          <p className={styles.eyebrow}>TIGER STORE · DIGITAL SUBSCRIPTIONS</p>
          <h1 id="hero-title">{locale === "ar" ? <>اشتراكات تحبّها،<br /><span>وخدمة تقدر توثق فيها.</span></> : locale === "fr" ? <>Vos abonnements préférés.<br /><span>Votre boutique de confiance.</span></> : <>Subscriptions you love.<br /><span>A store you can trust.</span></>}</h1>
          <a href="#subscriptions" className={styles.quietLink}>{c.browse}<ArrowUpRight size={18} aria-hidden="true" /></a>
        </section>
        <section className={`${styles.container} ${styles.featuredSection}`} aria-labelledby="featured-title">
          {featured && (
            <article
              className={styles.featured}
              aria-labelledby="featured-title"
            >
              <div className={styles.featuredTop}>
                <span>{locale === "ar" ? "الأكثر مبيعاً" : locale === "fr" ? "Le plus vendu" : "Bestseller"}</span>
                <span
                  className={
                    featured.available ? styles.available : styles.unavailable
                  }
                >
                  {featured.available ? c.available : c.unavailable}
                </span>
              </div>
              <div className={styles.featuredBody}>
                <Link
                  href={featured.href}
                  prefetch={false}
                  className={styles.featuredImage}
                  aria-label={featured.name}
                >
                  <Image
                    src={featured.image}
                    alt={featured.name}
                    fill
                    priority
                    sizes="(min-width: 768px) 340px, 240px"
                    className={styles.artwork}
                  />
                </Link>
                <div className={styles.featuredInfo}>
                  <h2 id="featured-title" dir="ltr">Snapchat+</h2>
                  <div className={styles.featuredOffer}><p className={styles.featuredDuration}>{annualDuration}</p><strong className={styles.featuredPrice} dir="ltr">2,300 DA</strong></div>
                  <p className={styles.featuredDescription}>{c.snapDescription}</p>
                  <Link href={featured.href} prefetch={false} className={styles.featuredCta}>
                    {c.viewOffers}
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          )}
        </section>
        <HomeCatalog products={cards.filter((product) => product.slug !== "snapchat-plus")} locale={locale} />
        <section
          id="how-it-works"
          className={`${styles.container} ${styles.section}`}
          aria-labelledby="steps-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>{c.stepsEyebrow}</p>
              <h2 id="steps-title">{c.stepsTitle}</h2>
            </div>
          </div>
          <ol className={styles.steps}>
            {c.steps.map(([title], index) => (
              <li key={title}>
                <span className={styles.stepNumber} aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3>{title}</h3>
                </div>
              </li>
            ))}
          </ol>
          <div className={styles.activationNote}>
            <FileCheck2 size={20} aria-hidden="true" />
            <p>{c.activation}</p>
          </div>
        </section>
        <section
          className={`${styles.container} ${styles.faqSection}`}
          aria-labelledby="questions-title"
        >
          <div className={styles.faqIntro}>
            <div className={styles.faqHeading}>
              <p className={styles.eyebrow}>{c.faqEyebrow}</p>
              <h2 id="questions-title">{c.faqTitle}</h2>
              <Link href="/refund-policy" className={styles.quietLink}>
                {c.warrantyPolicy}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <div className={styles.contactCard}>
              <Instagram size={24} aria-hidden="true" />
              <h3>{c.contactTitle}</h3>
              <a
                href={instagram}
                target="_blank"
                rel="noreferrer"
                className={styles.quietLink}
              >
                {c.instagram}
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className={styles.whatsapp}
              >
                <MessageCircle size={16} aria-hidden="true" />
                WhatsApp
              </a>
            </div>
          </div>
          <div className={styles.questions}>
            {c.questions.slice(0, 3).map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <Plus size={20} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
            <Link href="/faq" className={styles.quietLink}>
              {c.allFaq}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section
          className={`${styles.container} ${styles.finalCta}`}
          aria-labelledby="final-title"
        >
          <div>
            <p className={styles.eyebrow}>TIGER STORE</p>
            <h2 id="final-title">{locale === "ar" ? "اكتشف اشتراكك التالي." : locale === "fr" ? "Découvrez votre prochain abonnement." : "Find your next subscription."}</h2>
          </div>
          <Link href="/shop" className={styles.primary}>
            {c.browse}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </main>
      <footer className={`${styles.container} ${styles.footer}`}>
        <div className={styles.footerTop}>
          <Link href="/" className={styles.logo}>
            <Image
              src="/logo/tiger-store-ui.png"
              alt="Tiger Store"
              width={42}
              height={42}
            />
            <span aria-hidden="true">Tiger Store</span>
          </Link>
          <nav aria-label={c.footerNav}>
            {[
              ["/shop", c.shop],
              ["/payment-methods", c.payWith],
              ["/contact", c.support],
              ["/refund-policy", c.refund],
              ["/privacy-policy", c.privacy],
              ["/terms-and-conditions", c.terms],
            ].map(([href, label]) => (
              <Link href={href} key={href}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <p>{c.disclaimer}</p>
          <span dir="ltr">© {new Date().getFullYear()} Tiger Store</span>
        </div>
      </footer>
    </div>
  );
}
