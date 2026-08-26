import Image from "next/image";
import Link from "next/link";
import { CategoryShowcase } from "@/components/CategoryShowcase";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { LocalizedText } from "@/components/LocalizedText";
import { ProductCard } from "@/components/ProductCard";
import { getProducts, getSettings } from "@/lib/admin-store";
import { getSiteCategories } from "@/lib/categories";
import { createPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = createPageMetadata({
  title: "اشتراكات رقمية في الجزائر",
  description: "تصفح اشتراكات رقمية مع طلب ضيف واضح وطرق دفع محلية للعملاء في الجزائر.",
  path: "/",
});

export default async function Home() {
  const products = await getProducts();
  const settings = await getSettings();
  const featuredProducts = products.filter((product) => product.featured).slice(0, 8);
  const newProducts = [...products].slice(-8).reverse();

  return <><Header /><main className="store-shell"><Hero /><CategoryShowcase categories={getSiteCategories(products)} products={products} className="pt-4" /><ProductShelf title={{ ar: "منتجات مميزة", en: "Featured" }} products={featuredProducts} href="/shop" /><ProductShelf title={{ ar: "أحدث المنتجات", en: "New" }} products={newProducts} href="/shop" compact /><section id="payment" className="mx-auto max-w-[1440px] px-3 py-7 sm:px-5 lg:px-8"><SectionTitle title={{ ar: "طرق الدفع", en: "Payment" }} href="/payment-methods" /><div className="grid gap-3 md:grid-cols-3">{[{ name: "BaridiMob", text: { ar: `RIP: ${settings.baridiMobRip}`, en: `RIP: ${settings.baridiMobRip}` }, logo: "/logos/payments/baridimob.png" }, { name: "CCP", text: { ar: "تأكيد تفاصيل الدفع بعد مراجعة الطلب.", en: "Payment details after order review." }, logo: "/logos/payments/algerie-poste.svg" }, { name: "RedotPay", text: { ar: "متاح لبعض الطلبات.", en: "Available for selected orders." }, logo: "/logos/payments/redotpay.svg" }].map(({ name, text, logo }) => <article key={name} className="premium-card rounded-md p-5"><span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E7E3DC] p-2"><Image src={logo} alt={`${name} logo`} width={44} height={44} className="h-full w-full object-contain" /></span><h3 className="text-lg font-black text-[#151515]">{name}</h3><p className="mt-2 text-sm font-bold leading-7 text-[#66615B]"><LocalizedText {...text} /></p></article>)}</div></section></main><Footer disclaimer={settings.footerDisclaimer} /></>;
}

function SectionTitle({ title, href }: { title: { ar: string; en: string }; href: string }) {
  return <div className="mb-4 flex items-end justify-between gap-3"><h2 className="text-2xl font-black text-[#151515]"><LocalizedText {...title} /></h2><Link href={href} className="shrink-0 text-sm font-black text-[#C54E00] hover:text-[#151515]"><LocalizedText ar="عرض الكل" en="View all" /></Link></div>;
}

function ProductShelf({ title, products, href, compact }: { title: { ar: string; en: string }; products: Awaited<ReturnType<typeof getProducts>>; href: string; compact?: boolean }) {
  if (!products.length) return null;
  return <section className="mx-auto max-w-[1440px] px-3 py-7 sm:px-5 lg:px-8"><SectionTitle title={title} href={href} /><div className={`grid grid-cols-2 gap-3 sm:gap-4 ${compact ? "md:grid-cols-4 xl:grid-cols-4" : "md:grid-cols-3 xl:grid-cols-4"}`}>{products.map((product) => <ProductCard key={`${title.en}-${product.id}`} product={product} compact={compact} />)}</div></section>;
}
