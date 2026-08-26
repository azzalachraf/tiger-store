import { getProducts } from "@/lib/admin-store";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WishlistView } from "@/components/WishlistView";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Wishlist",
  description: "Your saved Tiger Store digital subscription products.",
  path: "/wishlist",
  robots: { index: false, follow: false },
});

export default async function WishlistPage() {
  const products = await getProducts();

  return (
    <>
      <Header />
      <WishlistView products={products} />
      <Footer />
    </>
  );
}
