import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetails } from "@/components/ProductDetails";
import { LocalizedText } from "@/components/LocalizedText";
import { getProductBySlug, getProducts } from "@/lib/admin-store";
import { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  return {
    title: product ? product.name : "Product",
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const products = await getProducts();
  const relatedProducts = (products as Product[])
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 4);

  return (
    <>
      <Header />
      <main className="store-shell min-h-screen px-3 py-6 sm:px-5 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <ProductDetails product={product} />

          {relatedProducts.length ? (
            <section className="mt-10">
              <div className="mb-5">
                <p className="font-bold text-tiger-gold">
                  <LocalizedText ar="منتجات مشابهة" en="Related Products" />
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  <LocalizedText ar="من نفس القسم" en="From the same category" />
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {relatedProducts.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
