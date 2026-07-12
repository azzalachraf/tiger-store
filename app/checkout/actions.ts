"use server";

import { revalidatePath } from "next/cache";
import { saveOrder } from "@/lib/admin-store";
import { AdminOrder, CartItem, PaymentMethodId } from "@/lib/types";
import { sendConversionEvent } from "@/lib/meta-capi";
import { getMarketingConfig } from "@/lib/marketing-store";
import { recordPageEvent } from "@/lib/page-events";
import { checkoutOrderInputSchema } from "@/lib/validation";

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
  const expectedTotal = parsed.products.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (Math.abs(expectedTotal - parsed.total) > 1) {
    throw new Error("Order total does not match cart contents.");
  }

  const order: AdminOrder = {
    id: crypto.randomUUID(),
    customerName: parsed.customerName,
    phone: parsed.phone,
    email: parsed.email || parsed.phone,
    products: parsed.products,
    paymentMethod: parsed.paymentMethod,
    total: parsed.total,
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
        value: parsed.total,
        currency: "DZD",
        contentIds: parsed.products.map((p) => p.productId),
        orderId: order.id,
        numItems: parsed.products.length,
      });
    }
  } catch {
    // Non-critical — don't fail the order
  }

  revalidatePath("/admin", "layout");
}
