import { getProducts } from "@/lib/admin-store";
import { CartView } from "@/components/CartView";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata = {
  title: "Cart",
};

export default async function CartPage() {
  const products = await getProducts();

  return (
    <>
      <Header />
      <CartView products={products} />
      <Footer />
    </>
  );
}
