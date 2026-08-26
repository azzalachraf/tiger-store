"use server";

import { revalidatePath } from "next/cache";
import { saveOrder } from "@/lib/admin-store";
import { AdminOrder, CartItem, PaymentMethodId } from "@/lib/types";
import { sendConversionEvent } from "@/lib/meta-capi";
import { getMarketingConfig } from "@/lib/marketing-store";
import { recordPageEvent } from "@/lib/page-events";
import { checkoutOrderInputSchema } from "@/lib/validation";
import { getProductById } from "@/lib/admin-store";

export async function submitOrderAction(data: {
  customerName: string;
  phone: string;
  email: string;
  products: CartItem[];
  paymentMethod: PaymentMethodId;
  total: number;
  notes?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  eventId?: string;
}) {
  const parsed = checkoutOrderInputSchema.parse(data);
  const authoritativeProducts: CartItem[] = [];
  for (const submitted of parsed.products) {
    const product = await getProductById(submitted.productId);
    if (!product || !product.available) throw new Error("One or more products are unavailable.");
    const offer = product.priceOptions?.length
      ? product.priceOptions.find((item) => item.id === submitted.optionId)
      : { id: `${product.id}:default`, label: product.duration, labelAr: product.durationAr, duration: product.duration, durationAr: product.durationAr, price: product.price, available: product.available };
    if (!offer || offer.available === false || offer.price <= 0) throw new Error("One or more selected offers are unavailable.");
    authoritativeProducts.push({
      id: `${product.id}:${offer.id}`, productId: product.id, slug: product.slug, name: product.name, nameAr: product.nameAr,
      image: product.image, option: offer.label, optionId: offer.id, optionAr: offer.labelAr, duration: offer.duration, durationAr: offer.durationAr,
      price: offer.price, quantity: submitted.quantity,
    });
  }
  const expectedTotal = authoritativeProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const order: AdminOrder = {
    id: crypto.randomUUID(),
    customerName: parsed.customerName,
    phone: parsed.phone,
    email: parsed.email || parsed.phone,
    products: authoritativeProducts,
    paymentMethod: parsed.paymentMethod,
    total: expectedTotal,
    notes: parsed.notes,
    status: "pending",
    createdAt: new Date().toISOString(),
    utm_source: parsed.utm_source,
    utm_medium: parsed.utm_medium,
    utm_campaign: parsed.utm_campaign,
    referrer: parsed.referrer,
  };

  await saveOrder(order);

  // Record purchase_completed funnel event
  try {
    await recordPageEvent({
      event_type: "purchase_completed",
      session_id: undefined,
      utm_source: parsed.utm_source,
      utm_medium: parsed.utm_medium,
      utm_campaign: parsed.utm_campaign,
    });
  } catch {
    // Non-critical
  }

  // Fire Meta Conversions API event (server-side)
  try {
    const config = await getMarketingConfig();
    if (config.meta_capi_enabled && config.meta_pixel_id && config.meta_capi_token) {
      await sendConversionEvent({
        pixelId: config.meta_pixel_id,
        accessToken: config.meta_capi_token,
        eventName: "Purchase",
        eventId: parsed.eventId || `server-${order.id}`,
        email: order.email,
        phone: parsed.phone,
        value: expectedTotal,
        currency: "DZD",
        contentIds: authoritativeProducts.map((p) => p.productId),
        orderId: order.id,
        numItems: parsed.products.length,
      });
    }
  } catch {
    // Non-critical — don't fail the order
  }

  revalidatePath("/admin", "layout");
  return { id: order.id, products: authoritativeProducts, total: expectedTotal };
}
