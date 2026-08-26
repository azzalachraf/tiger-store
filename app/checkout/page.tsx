import { getProducts, getSettings } from "@/lib/admin-store";
import { CheckoutView } from "@/components/CheckoutView";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Checkout",
  description: "Complete your Tiger Store order with your contact details and preferred local payment method.",
  path: "/checkout",
  robots: { index: false, follow: false },
});

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
