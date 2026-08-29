import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { CheckoutView } from "@/components/CheckoutView";
import { getProducts, getSettings } from "@/lib/admin-store";
import { resolveProductCheckoutLinkTarget } from "@/lib/product-checkout-link";
import { logger } from "@/lib/logger";
import type { CartItem, PaymentMethodId, ProductPriceOption } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment link", robots: { index: false, follow: false } };

function findOffer(product: { id: string; price: number; oldPrice?: number; duration: string; durationAr: string; available: boolean; priceOptions?: ProductPriceOption[] }, optionId: string) {
  if (product.priceOptions?.length) {
    const exact = product.priceOptions.find((option) => option.id === optionId);
    if (exact) return exact;

    // Older product records may have kept a display-derived option ID. Match
    // only the public plan key (for example `12-months` ↔ `12 months`) and
    // still use the live server-side option, including its price and stock.
    const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const requested = key(optionId.replace(`${product.id}:`, ""));
    return product.priceOptions.find((option) => [option.id.replace(`${product.id}:`, ""), option.label, option.duration]
      .some((value) => key(value) === requested));
  }
  if (optionId !== `${product.id}:default`) return undefined;
  return { id: optionId, label: product.duration, labelAr: product.durationAr, duration: product.duration, durationAr: product.durationAr, price: product.price, oldPrice: product.oldPrice, available: product.available };
}

export default async function ProductPaymentLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await resolveProductCheckoutLinkTarget(token);
  if (!payload) {
    logger.warn("product payment link target was not resolved", { tokenLength: token.length });
    notFound();
  }

  // Use the normalized catalog collection used by storefront listings. This
  // preserves older stored products whose variants were saved without IDs,
  // while the selected offer is still resolved from the current server data.
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);
  const product = products.find((item) => item.slug === payload.slug);
  const offer = product ? findOffer(product, payload.optionId) : undefined;
  if (!product || !product.available || !offer || offer.available === false || offer.price <= 0) {
    logger.warn("product payment link target is unavailable", {
      slug: payload.slug,
      optionId: payload.optionId,
      productFound: Boolean(product),
      productAvailable: product?.available ?? false,
      offerFound: Boolean(offer),
      offerAvailable: offer?.available ?? false,
    });
    notFound();
  }

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
