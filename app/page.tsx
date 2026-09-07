import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowUpRight,
  ArrowDown,
  Check,
  CreditCard,
  FileCheck2,
  Instagram,
  MessageCircle,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { getProducts, getSettings } from "@/lib/admin-store";
import { createPageMetadata } from "@/lib/seo";
import { HomeNavigation } from "@/components/home/HomeNavigation";
import { HomeCatalog } from "@/components/home/HomeCatalog";
import { homeCopy } from "@/components/home/copy";
import { homeProduct } from "@/components/home/products";
import styles from "@/components/home/home.module.css";

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
  const cards = products.map((product) => homeProduct(product, locale));
  const featured = cards.find((product) => product.slug === "snapchat-plus");
  const instagram =
    settings.instagramUrl || "https://www.instagram.com/tigerr_store_dz/";
  const whatsapp = `https://wa.me/${settings.whatsappNumber.replace(/\D/g, "") || "213556974593"}`;
  return (
    <div
      className={styles.home}
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
    >
      <HomeNavigation />
      <main id="home-main">
        <section
          className={`${styles.container} ${styles.hero}`}
          aria-labelledby="home-title"
        >
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.brandDot} />
              {c.eyebrow}
            </p>
            <h1 id="home-title">
              {c.headline}
              <br />
              <span>{c.headlineAccent}</span>
            </h1>
            <p className={styles.intro}>{c.intro}</p>
            <div className={styles.heroActions}>
              <a href="#subscriptions" className={styles.primary}>
                {c.browse}
                <ArrowDown size={18} aria-hidden="true" />
              </a>
              <a href="#how-it-works" className={styles.quietLink}>
                {c.how}
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
            <p className={styles.heroNote}>
              <Check size={16} aria-hidden="true" />
              {c.guest}
              <span aria-hidden="true">·</span>
              {c.pricesDa}
            </p>
          </div>
          {featured && (
            <article
              className={styles.featured}
              aria-labelledby="featured-title"
            >
              <div className={styles.featuredTop}>
                <span>{c.spotlight}</span>
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
                    sizes="(min-width: 1000px) 200px, (min-width: 600px) 170px, 116px"
                    className={styles.artwork}
                  />
                </Link>
                <div className={styles.featuredInfo}>
                  <h2 id="featured-title" dir="auto">
                    {featured.name}
                  </h2>
                  <p>{c.snapDescription}</p>
                  <p className={styles.featuredDuration}>{featured.duration}</p>
                  <strong className={styles.featuredPrice} dir="ltr">
                    {featured.price}
                  </strong>
                  <Link href={featured.href} prefetch={false} className={styles.featuredCta}>
                    {featured.available ? c.choosePlan : c.viewDetails}
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <p className={styles.featuredFoot}>
                <ShieldCheck size={16} aria-hidden="true" />
                {c.checkCompatibility}
              </p>
            </article>
          )}
        </section>
        <div className={`${styles.container} ${styles.paymentBar}`}>
          <span>
            <CreditCard size={18} aria-hidden="true" />
            {c.payWith}
          </span>
          <div className={styles.paymentLogos}>
            {[
              ["BaridiMob", "/logos/payments/baridimob.png"],
              ["Binance", "/logos/payments/binance.svg"],
              ["RedotPay", "/logos/payments/redotpay.svg"],
            ].map(([name, src]) => (
              <span key={name}>
                <Image src={src} alt="" width={24} height={24} />
                {name}
              </span>
            ))}
          </div>
          <Link href="/payment-methods" className={styles.quietLink}>
            {c.paymentDetails}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <HomeCatalog products={cards} locale={locale} />
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
            <p>{c.stepsIntro}</p>
          </div>
          <ol className={styles.steps}>
            {c.steps.map(([title, body], index) => (
              <li key={title}>
                <span className={styles.stepNumber} aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
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
              <p>{c.faqIntro}</p>
              <Link href="/refund-policy" className={styles.quietLink}>
                {c.warrantyPolicy}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <div className={styles.contactCard}>
              <Instagram size={24} aria-hidden="true" />
              <h3>{c.contactTitle}</h3>
              <p>{c.contactBody}</p>
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
            {c.questions.map(([question, answer]) => (
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
            <h2 id="final-title">{c.finalTitle}</h2>
            <p>{c.finalBody}</p>
          </div>
          <a href="#subscriptions" className={styles.primary}>
            {c.browse}
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
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
              ["/categories", c.categories],
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
