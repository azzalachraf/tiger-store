import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LocalizedText } from "@/components/LocalizedText";
import { ProductCard } from "@/components/ProductCard";
import { getProducts } from "@/lib/admin-store";
import { categorySlug, getSiteCategories } from "@/lib/categories";
import { createPageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getSiteCategories()
    .filter((category) => category.id !== "all")
    .map((category) => ({ slug: categorySlug(category.id) }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const products = await getProducts();
  const category = getSiteCategories(products).find((item) => categorySlug(item.id) === slug);

  if (!category || category.id === "all") {
    return createPageMetadata({
      title: "Category Not Found",
      description: "The requested Tiger Store category is unavailable.",
      path: "/categories",
      robots: { index: false, follow: false },
    });
  }

  return createPageMetadata({
    title: `${category.name.en} Digital Subscriptions`,
    description: `Browse Tiger Store ${category.name.en} digital subscription plans, prices, and availability.`,
    path: `/categories/${slug}`,
  });
}

export default async function CategoryDetailPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const products = await getProducts();
  const category = getSiteCategories(products).find((item) => categorySlug(item.id) === slug);

  if (!category || category.id === "all") {
    notFound();
  }

  const categoryProducts = products.filter((product) => product.category === category.id);

  return (
    <>
      <Header />
      <main className="store-shell min-h-screen px-3 py-6 sm:px-5 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <section className="store-panel mb-5 rounded-md p-5 sm:p-7">
            <Link href="/categories" className="text-sm font-black text-tiger-gold transition-colors duration-150 hover:text-white">
              <LocalizedText ar="كل الأقسام" en="All Categories" />
            </Link>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">
              <LocalizedText ar={category.name.ar} en={category.name.en} />
            </h1>
            <p className="mt-1 text-sm font-bold text-white/50">
              <LocalizedText ar={category.name.en} en={category.name.ar} />
            </p>
          </section>

          {categoryProducts.length ? (
            <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {categoryProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </section>
          ) : (
            <div className="store-panel rounded-md p-6 text-center text-white/65">
              <LocalizedText ar="لا توجد منتجات متوفرة في هذا القسم حاليا." en="No products are available in this category yet." />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
