import Link from "next/link";
import Image from "next/image";
import categories from "@/data/categories.json";
import { CategoryShowcase } from "@/components/CategoryShowcase";
import { Footer } from "@/components/Footer";
import { FaqPreview } from "@/components/FaqPreview";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { LocalizedText } from "@/components/LocalizedText";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { getProducts, getSettings } from "@/lib/admin-store";
import { Category, Product } from "@/lib/types";
import type { ReactNode } from "react";
import { BadgeCheck, CreditCard, Headphones, ShieldCheck, Zap } from "lucide-react";

const trustItems = [
  { title: "تفعيل سريع", subtitle: "Fast activation", icon: Zap },
  { title: "دعم بعد البيع", subtitle: "After-sale support", icon: Headphones },
  { title: "أسعار مناسبة", subtitle: "Fair prices", icon: BadgeCheck },
  { title: "طرق دفع جزائرية", subtitle: "BaridiMob, CCP, RedotPay", icon: CreditCard },
];

export default async function Home() {
  const products = await getProducts();
  const settings = await getSettings();
  const siteCategories = categories as Category[];
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
              <article key={item.title} className="store-panel rounded-md p-3 sm:p-4">
                <item.icon className="mb-3 h-5 w-5 text-tiger-ember" />
                <h3 className="text-sm font-black text-white sm:text-base">{item.title}</h3>
                <p className="mt-1 text-xs font-bold text-white/50">{item.subtitle}</p>
              </article>
            ))}
          </div>
        </section>

        <CategoryShowcase categories={siteCategories} products={products} className="pt-2" />

        {saleProducts.length ? (
        <ProductShelf eyebrow="Sale" title={<LocalizedText ar="المنتجات المخفضة" en="Sale products" />} products={saleProducts} href="/shop?sale=true" />
        ) : null}
        <ProductShelf eyebrow="Featured" title={<LocalizedText ar="منتجات مختارة" en="Featured products" />} products={featuredProducts} href="/shop" />
        <ProductShelf eyebrow="Best Sellers" title={<LocalizedText ar="الأكثر طلبا" en="Most requested" />} products={mostRequested} href="/shop" compact />
        <ProductShelf eyebrow="New" title={<LocalizedText ar="وصل حديثا" en="New products" />} products={newProducts} href="/shop" compact />

        <section id="payment" className="mx-auto max-w-[1440px] px-3 py-7 sm:px-5 lg:px-8">
          <SectionTitle eyebrow="Payment Methods" title={<LocalizedText ar="طرق الدفع" en="Payment Methods" />} href="/payment-methods" />
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { name: "BaridiMob", text: `RIP: ${settings.baridiMobRip}`, logo: "/logos/payments/baridimob.png" },
              { name: "CCP", text: <LocalizedText ar="سيتم تأكيد تفاصيل الدفع بعد إرسال الطلب." en="Payment details will be confirmed after order submission." />, logo: "/logos/payments/algerie-poste.svg" },
              { name: "RedotPay", text: <LocalizedText ar="سيتم تأكيد تفاصيل الدفع بعد إرسال الطلب." en="Payment details will be confirmed after order submission." />, logo: "/logos/payments/redotpay.svg" },
            ].map(({ name, text, logo }) => (
              <article key={name} className="store-panel rounded-md p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-tiger-ember/35">
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white p-2">
                  <Image src={logo} alt={`${name} logo`} width={44} height={44} className="h-full w-full object-contain" />
                </span>
                <h3 className="text-lg font-black text-white">{name}</h3>
                <p className="mt-2 text-sm leading-7 text-white/62">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-3 py-7 sm:px-5 lg:px-8">
          <SectionTitle eyebrow="Why Tiger Store" title={<LocalizedText ar="لماذا تختار Tiger Store؟" en="Why choose Tiger Store?" />} href="/about" />
          <div className="grid gap-3 md:grid-cols-5">
            {["آمن وموثوق", "تفعيل سريع", "أسعار واضحة", "دفع بسيط", "دعم مستمر"].map((item) => (
              <div key={item} className="store-panel rounded-md p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-tiger-ember" />
                <p className="font-black text-white">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <FaqPreview />

        <section className="mx-auto max-w-[1440px] px-3 pb-10 pt-4 sm:px-5 lg:px-8">
          <div className="rounded-md border border-tiger-ember/25 bg-[#211813] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.36)] sm:p-7">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-tiger-gold">
                  <LocalizedText ar="ابدأ التسوق" en="Start Shopping" />
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  <LocalizedText ar="اختر الاشتراك المناسب وأكمل الطلب بخطوات بسيطة." en="Choose the right subscription and complete your order in simple steps." />
                </h2>
              </div>
              <Button asChild>
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
          <ProductCard key={`${title}-${product.id}`} product={product} compact={compact} />
        ))}
      </div>
    </section>
  );
}
