"use server";

import { revalidatePath } from "next/cache";
import { saveOrder } from "@/lib/admin-store";
import { AdminOrder, CartItem, PaymentMethodId } from "@/lib/types";
import { sendConversionEvent } from "@/lib/meta-capi";
import { getMarketingConfig } from "@/lib/marketing-store";
import { recordPageEvent } from "@/lib/page-events";

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
  const order: AdminOrder = {
    id: crypto.randomUUID(),
    customerName: data.customerName,
    phone: data.phone,
    email: data.email,
    products: data.products,
    paymentMethod: data.paymentMethod,
    total: data.total,
    notes: data.notes,
    status: "pending",
    createdAt: new Date().toISOString(),
    utm_source: data.utm_source,
    utm_medium: data.utm_medium,
    utm_campaign: data.utm_campaign,
    referrer: data.referrer,
  };

  await saveOrder(order);

  // Record purchase_completed funnel event
  try {
    await recordPageEvent({
      event_type: "purchase_completed",
      session_id: undefined,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
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
        eventId: data.eventId || `server-${order.id}`,
        email: data.email,
        phone: data.phone,
        value: data.total,
        currency: "DZD",
        contentIds: data.products.map((p) => p.productId),
        orderId: order.id,
        numItems: data.products.length,
      });
    }
  } catch {
    // Non-critical — don't fail the order
  }

  revalidatePath("/admin", "layout");
}
