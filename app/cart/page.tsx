import { getProducts } from "@/lib/admin-store";
import { CartView } from "@/components/CartView";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Cart",
  description: "Review the digital subscription items selected for your Tiger Store order.",
  path: "/cart",
  robots: { index: false, follow: false },
});

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
