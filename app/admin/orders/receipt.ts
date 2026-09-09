"use server";
import { requireAdmin } from "@/lib/admin-auth";
import { getOrderById, getReceiptSignedUrl } from "@/lib/admin-store";
import { adminOrderIdSchema } from "@/lib/validation";
export async function loadPrivateReceipt(orderId: string) {
  await requireAdmin();
  const order = await getOrderById(adminOrderIdSchema.parse(orderId));
  if (!order?.receiptPath) throw new Error("Receipt not available.");
  const url = await getReceiptSignedUrl(order.receiptPath);
  if (!url) throw new Error("Receipt not available.");
  return url;
}
