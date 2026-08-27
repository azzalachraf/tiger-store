import "server-only";

import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";
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

async function sendTelegramMessage(token: string, body: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function sendTelegramReceipt(token: string, chatId: string, order: AdminOrder) {
  if (!order.receiptPath) return;

  const receipt = await getSupabaseServiceClient().storage.from("receipts").download(order.receiptPath);
  if (receipt.error || !receipt.data) {
    console.warn("Telegram receipt attachment could not be downloaded; order notification was sent without it.");
    return;
  }

  const extension = order.receiptPath.split(".").pop() || "image";
  const formData = new FormData();
  formData.set("chat_id", chatId);
  formData.set("caption", `<b>وصل الدفع للطلب:</b> <code>${escapeTelegramHtml(order.id)}</code>`);
  formData.set("parse_mode", "HTML");
  formData.set("document", new Blob([await receipt.data.arrayBuffer()], { type: receipt.data.type || "application/octet-stream" }), `receipt-${order.id}.${extension}`);

  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    console.warn("Telegram receipt attachment failed; order notification was sent without it.");
  }
}

export async function notifyTelegramOfOrder(order: AdminOrder) {
  const env = getServerEnv();
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.warn("Telegram order notification is not configured; order was saved without a Telegram message.");
    return;
  }

  try {
    const response = await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, {
      chat_id: env.TELEGRAM_CHAT_ID,
      text: formatOrderMessage(order),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });

    if (!response.ok) {
      console.warn("Telegram order notification failed; order remains saved.");
      return;
    }

    await sendTelegramReceipt(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, order);
  } catch {
    console.warn("Telegram order notification failed; order remains saved.");
  }
}
