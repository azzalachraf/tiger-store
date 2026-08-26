import { getProducts } from "@/lib/admin-store";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ShopCatalog } from "@/components/ShopCatalog";
import { getSiteCategories } from "@/lib/categories";
import { findCatalogProducts } from "@/lib/catalog-search";
import { createPageMetadata } from "@/lib/seo";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata({
  title: "Shop Digital Subscriptions",
  description: "Explore Tiger Store digital subscription plans, product details, prices, and availability in Algeria.",
  path: "/shop",
});

export const dynamic = "force-dynamic";

type ShopPageProps = {
  searchParams: Promise<{ category?: string; featured?: string; sale?: string; q?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { category, featured, sale, q } = await searchParams;
  const products = await getProducts();
  const categories = getSiteCategories(products);
  const query = q?.trim().slice(0, 80) ?? "";
  const matches = query ? findCatalogProducts(products, query) : products;

  if (query && matches.length === 1) redirect(`/products/${matches[0].slug}`);

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <ShopCatalog
          products={products}
          categories={categories}
          initialCategory={category ?? "all"}
          initialFeatured={featured === "true"}
          initialSale={sale === "true"}
          initialQuery={query}
        />
      </main>
      <Footer />
    </>
  );
}
