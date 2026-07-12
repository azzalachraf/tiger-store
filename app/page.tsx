import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { BadgeCheck, CheckCircle2, CreditCard, Headphones, MessageCircle, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { CategoryShowcase } from "@/components/CategoryShowcase";
import { Footer } from "@/components/Footer";
import { FaqPreview } from "@/components/FaqPreview";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { LocalizedText } from "@/components/LocalizedText";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { getProducts, getSettings } from "@/lib/admin-store";
import { getSiteCategories } from "@/lib/categories";
import { Product } from "@/lib/types";

const trustItems = [
  { title: "تفعيل سريع", subtitle: "Fast activation", icon: Zap },
  { title: "دعم مستمر", subtitle: "After-sale support", icon: Headphones },
  { title: "ضمان كامل", subtitle: "Full guarantee", icon: BadgeCheck },
  { title: "دفع مرن", subtitle: "BaridiMob, CCP, RedotPay", icon: CreditCard },
];

export default async function Home() {
  const products = await getProducts();
  const settings = await getSettings();
  const siteCategories = getSiteCategories(products);
  const saleProducts = products.filter((product) => product.oldPrice && product.oldPrice > product.price).slice(0, 8);
  const featuredProducts = products.filter((product) => product.featured).slice(0, 8);
  const mostRequested = [...products].sort((a, b) => Number(b.featured) - Number(a.featured) || a.price - b.price).slice(0, 8);
  const newProducts = [...products].slice(-8).reverse();

  return (
    <>
      <Header />
      <main className="store-shell">
        <Hero products={products} />

        <section className="mx-auto max-w-[1440px] px-3 py-5 sm:px-5 lg:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {trustItems.map((item) => (
              <article key={item.title} className="premium-card rounded-md p-4">
                <item.icon className="mb-3 h-5 w-5 text-tiger-ember" />
                <h3 className="text-sm font-black text-white sm:text-base">{item.title}</h3>
                <p className="mt-1 text-xs font-bold text-white/54">{item.subtitle}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-3 py-6 sm:px-5 lg:px-8">
          <div className="grid gap-4 rounded-md border border-white/10 bg-[#181818] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.32)] md:grid-cols-3 md:p-5">
            {[
              { title: "اختر الاشتراك", text: "تصفح المنتجات والخطط المتوفرة.", icon: Sparkles },
              { title: "أكد الطلب", text: "املأ معلوماتك واختر طريقة الدفع.", icon: CheckCircle2 },
              { title: "استلم التفعيل", text: "نكمل معك حتى التفعيل.", icon: MessageCircle },
            ].map((step, index) => (
              <article key={step.title} className="rounded-md border border-white/8 bg-white/[0.035] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-tiger-ember text-sm font-black text-black">0{index + 1}</span>
                  <step.icon className="h-5 w-5 text-tiger-gold" />
                </div>
                <h2 className="text-lg font-black text-white">{step.title}</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-white/58">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <CategoryShowcase categories={siteCategories} products={products} className="pt-2" />

        {saleProducts.length ? (
          <ProductShelf eyebrow="Deals" title={<LocalizedText ar="العروض المخفضة" en="Sale products" />} products={saleProducts} href="/shop?sale=true" />
        ) : null}
        <ProductShelf eyebrow="Featured" title={<LocalizedText ar="اشتراكات مختارة" en="Featured products" />} products={featuredProducts} href="/shop" />
        <ProductShelf eyebrow="Best Sellers" title={<LocalizedText ar="الأكثر طلبا" en="Most requested" />} products={mostRequested} href="/shop" compact />
        <ProductShelf eyebrow="New" title={<LocalizedText ar="وصل حديثا" en="New products" />} products={newProducts} href="/shop" compact />

        <section id="payment" className="mx-auto max-w-[1440px] px-3 py-7 sm:px-5 lg:px-8">
          <SectionTitle eyebrow="Payment" title={<LocalizedText ar="ادفع بالطريقة المناسبة لك" en="Pay with the method that suits you" />} href="/payment-methods" />
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { name: "BaridiMob", text: `RIP: ${settings.baridiMobRip}`, logo: "/logos/payments/baridimob.png" },
              { name: "CCP", text: <LocalizedText ar="نرسل لك تفاصيل الدفع بعد مراجعة الطلب." en="Payment details are confirmed after order review." />, logo: "/logos/payments/algerie-poste.svg" },
              { name: "RedotPay", text: <LocalizedText ar="طريقة متاحة لبعض الطلبات حسب التوفر." en="Payment available for selected orders." />, logo: "/logos/payments/redotpay.svg" },
            ].map(({ name, text, logo }) => (
              <article key={name} className="premium-card rounded-md p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-tiger-ember/35">
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white p-2">
                  <Image src={logo} alt={`${name} logo`} width={44} height={44} className="h-full w-full object-contain" />
                </span>
                <h3 className="text-lg font-black text-white">{name}</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-white/62">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-3 py-7 sm:px-5 lg:px-8">
          <div className="grid gap-5 rounded-md border border-tiger-ember/20 bg-[linear-gradient(135deg,rgba(255,106,0,0.11),rgba(24,24,24,0.98))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)] lg:grid-cols-[0.9fr_1.1fr] lg:p-7">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-tiger-gold">Trust</p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-4xl">
                <LocalizedText ar="لماذا يشتري العملاء من Tiger Store؟" en="Why customers choose Tiger Store" />
              </h2>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-8 text-white/64">
                <LocalizedText
                  ar="الزبون القادم من إعلان يحتاج وضوحا بسرعة: السعر، طريقة الدفع، الدعم، وماذا يحدث بعد الطلب. لذلك كل خطوة في المتجر مصممة لتقليل التردد."
                  en="Visitors from ads need clarity fast: price, payment, support, and what happens after ordering. Every step is designed to reduce hesitation."
                />
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {["تفعيل حسب المنتج", "مراجعة الطلب قبل الدفع", "دعم مستمر", "ضمان طيلة المدة"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-md border border-white/9 bg-black/20 p-4">
                  <ShieldCheck className="h-5 w-5 text-tiger-gold" />
                  <p className="font-black text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FaqPreview />

        <section className="mx-auto max-w-[1440px] px-3 pb-10 pt-4 sm:px-5 lg:px-8">
          <div className="rounded-md border border-tiger-ember/25 bg-[#211813] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.36)] sm:p-7">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-tiger-gold">
                  <LocalizedText ar="ابدأ الطلب" en="Start ordering" />
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  <LocalizedText ar="اختر الاشتراك المناسب وأكمل الطلب بخطوات بسيطة." en="Choose the right subscription and complete the order in simple steps." />
                </h2>
              </div>
              <Button asChild className="rounded-full">
                <Link href="/shop">
                  <LocalizedText ar="تسوق الآن" en="Shop Now" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer disclaimer={settings.footerDisclaimer} />
    </>
  );
}

function SectionTitle({ eyebrow, title, href }: { eyebrow: string; title: ReactNode; href: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-tiger-gold">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black text-white">{title}</h2>
      </div>
      <Link href={href} className="shrink-0 text-sm font-black text-tiger-gold transition-colors duration-150 hover:text-white">
        <LocalizedText ar="عرض الكل" en="View all" />
      </Link>
    </div>
  );
}

function ProductShelf({
  eyebrow,
  title,
  products,
  href,
  compact,
}: {
  eyebrow: string;
  title: ReactNode;
  products: Product[];
  href: string;
  compact?: boolean;
}) {
  if (!products.length) return null;

  return (
    <section className="mx-auto max-w-[1440px] px-3 py-7 sm:px-5 lg:px-8">
      <SectionTitle eyebrow={eyebrow} title={title} href={href} />
      <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${compact ? "md:grid-cols-4 xl:grid-cols-4" : "md:grid-cols-3 xl:grid-cols-4"}`}>
        {products.map((product) => (
          <ProductCard key={`${eyebrow}-${product.id}`} product={product} compact={compact} />
        ))}
      </div>
    </section>
  );
}
