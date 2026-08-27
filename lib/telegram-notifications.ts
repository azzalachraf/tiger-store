import "server-only";

import { getServerEnv } from "@/lib/env";
import type { AdminOrder } from "@/lib/types";

function escapeTelegramHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatOrderItems(order: AdminOrder) {
  return order.products
    .map((item) => {
      const option = item.optionAr || item.option;
      return `- ${escapeTelegramHtml(item.nameAr || item.name)} (${escapeTelegramHtml(option)}) x${item.quantity}`;
    })
    .join("\n");
}

function formatOrderMessage(order: AdminOrder) {
  const notes = order.notes?.trim();
  return [
    "طلب جديد في Tiger Store",
    "",
    `<b>الكود:</b> <code>${escapeTelegramHtml(order.id)}</code>`,
    `<b>الزبون:</b> ${escapeTelegramHtml(order.customerName)}`,
    `<b>الهاتف:</b> <code>${escapeTelegramHtml(order.phone)}</code>`,
    `<b>الدفع:</b> ${escapeTelegramHtml(order.paymentMethod)}`,
    `<b>المجموع:</b> ${order.total.toLocaleString("en-US")} DA`,
    "",
    "<b>المنتجات:</b>",
    formatOrderItems(order),
    "",
    order.receiptPath ? "<b>الوصل:</b> مرفوع في لوحة الادارة الخاصة" : "<b>الوصل:</b> غير موجود",
    notes ? `<b>ملاحظات:</b> ${escapeTelegramHtml(notes)}` : "",
    `<b>وقت الطلب:</b> ${escapeTelegramHtml(order.createdAt)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function notifyTelegramOfOrder(order: AdminOrder) {
  const env = getServerEnv();
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.warn("Telegram order notification is not configured; order was saved without a Telegram message.");
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: formatOrderMessage(order),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      console.warn("Telegram order notification failed; order remains saved.");
    }
  } catch {
    console.warn("Telegram order notification failed; order remains saved.");
  }
}
