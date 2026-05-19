import { getProducts } from "@/lib/admin-store";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WishlistView } from "@/components/WishlistView";

export const metadata = {
  title: "Wishlist",
};

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
