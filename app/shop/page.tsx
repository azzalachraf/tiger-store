import { getProducts } from "@/lib/admin-store";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ShopCatalog } from "@/components/ShopCatalog";
import { getSiteCategories } from "@/lib/categories";

export const metadata = {
  title: "Shop",
};

export const dynamic = "force-dynamic";

type ShopPageProps = {
  searchParams: Promise<{ category?: string; featured?: string; sale?: string; q?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { category, featured, sale, q } = await searchParams;
  const products = await getProducts();
  const categories = getSiteCategories(products);

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
          initialQuery={q ?? ""}
        />
      </main>
      <Footer />
    </>
  );
}
