import Link from "next/link";
import { CategoryShowcase } from "@/components/CategoryShowcase";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LocalizedText } from "@/components/LocalizedText";
import { getProducts } from "@/lib/admin-store";
import { getSiteCategories } from "@/lib/categories";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Digital Subscription Categories",
  description: "Browse Tiger Store categories for AI, design, education, developer tools, and digital subscriptions.",
  path: "/categories",
});

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const products = await getProducts();
  const categories = getSiteCategories(products);

  return (
    <>
      <Header />
      <main className="store-shell min-h-screen px-3 py-6 sm:px-5 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <section className="store-panel rounded-md p-5 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-tiger-gold">
              <LocalizedText ar="الأقسام" en="Categories" />
            </p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              <LocalizedText ar="الأقسام الرقمية" en="Digital categories" />
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/62">
              <LocalizedText
                ar="اختر القسم المناسب وتصفح المنتجات بسرعة. أدوات الذكاء الاصطناعي، التصميم، التعليم، الحماية، والمزيد."
                en="Choose a category and browse products quickly. AI tools, design apps, learning, privacy, and more."
              />
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-tiger-ember px-5 text-sm font-black text-black transition-colors duration-150 hover:bg-tiger-gold"
            >
              <LocalizedText ar="عرض كل المنتجات" en="View All Products" />
            </Link>
          </section>
        </div>

        <CategoryShowcase categories={categories} products={products} className="px-0 sm:px-0 lg:px-0" />
      </main>
      <Footer />
    </>
  );
}
