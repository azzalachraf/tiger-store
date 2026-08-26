import "server-only";

import { getServerEnv } from "@/lib/env";
import type { AdminOrder } from "@/lib/types";

export async function notifyOwnerOfReceipt(order: AdminOrder) {
  const env = getServerEnv();
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_OWNER_PHONE) {
    console.warn("WhatsApp owner notification is not configured; order was saved without a notification.");
    return;
  }

  const body = [
    `New Tiger Store order: ${order.id}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Payment: ${order.paymentMethod}`,
    `Total: ${order.total} DZD`,
    `Items: ${order.products.map((item) => `${item.name} (${item.option}) ×${item.quantity}`).join(", ")}`,
    "Receipt attached in the secure admin panel.",
  ].join("\n");

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: env.WHATSAPP_OWNER_PHONE.replace(/\D/g, ""), type: "text", text: { body } }),
    });
    if (!response.ok) console.warn("WhatsApp owner notification failed; order remains saved.");
  } catch {
    console.warn("WhatsApp owner notification failed; order remains saved.");
  }
}
