import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { CheckoutView } from "@/components/CheckoutView";
import { getProductBySlug, getSettings } from "@/lib/admin-store";
import { verifyProductCheckoutLink } from "@/lib/product-checkout-link";
import type { CartItem, PaymentMethodId, ProductPriceOption } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment link", robots: { index: false, follow: false } };

function findOffer(product: { id: string; price: number; oldPrice?: number; duration: string; durationAr: string; available: boolean; priceOptions?: ProductPriceOption[] }, optionId: string) {
  if (product.priceOptions?.length) return product.priceOptions.find((option) => option.id === optionId);
  if (optionId !== `${product.id}:default`) return undefined;
  return { id: optionId, label: product.duration, labelAr: product.durationAr, duration: product.duration, durationAr: product.durationAr, price: product.price, oldPrice: product.oldPrice, available: product.available };
}

export default async function ProductPaymentLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = verifyProductCheckoutLink(token);
  if (!payload) notFound();

  const [product, settings] = await Promise.all([getProductBySlug(payload.slug), getSettings()]);
  const offer = product ? findOffer(product, payload.optionId) : undefined;
  if (!product || !product.available || !offer || offer.available === false || offer.price <= 0) notFound();

  const item: CartItem = {
    id: `${product.id}:${offer.id}`,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    nameAr: product.nameAr,
    image: product.image,
    option: offer.label,
    optionId: offer.id,
    optionAr: offer.labelAr,
    duration: offer.duration,
    durationAr: offer.durationAr,
    price: offer.price,
    quantity: 1,
  };
  const allowedPaymentMethods: PaymentMethodId[] = product.slug === "snapchat-plus"
    ? ["BaridiMob", "Binance", "RedotPay", "Flexy"]
    : ["BaridiMob", "Binance", "RedotPay"];

  return <><Header /><CheckoutView products={[product]} settings={settings} initialItems={[item]} lockedProductLink allowedPaymentMethods={allowedPaymentMethods} /><Footer /></>;
}
