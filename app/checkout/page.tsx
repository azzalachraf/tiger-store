import { getProducts, getSettings } from "@/lib/admin-store";
import { CheckoutView } from "@/components/CheckoutView";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata = {
  title: "Checkout",
};

type CheckoutPageProps = {
  searchParams: Promise<{ product?: string; option?: string }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { product, option } = await searchParams;
  const products = await getProducts();
  const settings = await getSettings();

  return (
    <>
      <Header />
      <CheckoutView
        products={products}
        directProductSlug={product}
        directOption={option}
        settings={settings}
      />
      <Footer />
    </>
  );
}
