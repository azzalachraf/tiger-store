import "server-only";

import { getOrderById, saveOrder } from "@/lib/admin-store";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { createWarrantyLink } from "@/lib/warranty";

type IssueOrderWarrantyInput = {
  orderId: string;
  itemIndex: number;
  coveredDays: number;
  markDelivered?: boolean;
};

export async function issueOrderWarrantyLink(input: IssueOrderWarrantyInput) {
  const order = await getOrderById(input.orderId);
  if (!order || !order.products[input.itemIndex]) {
    throw new Error("The selected order item is unavailable.");
  }

  if (input.markDelivered) {
    if (order.status === "cancelled" || order.status === "refunded") {
      throw new Error("A cancelled or refunded order cannot receive a warranty link.");
    }
    if (order.status !== "delivered") {
      await saveOrder({ ...order, status: "delivered" });
    }
  } else if (order.status !== "delivered") {
    throw new Error("A warranty link can only be issued for a delivered order item.");
  }

  const { error } = await getSupabaseServiceClient()
    .from("order_sheet_exports")
    .upsert({ order_id: input.orderId, warranty_issued_at: new Date().toISOString() }, { onConflict: "order_id", ignoreDuplicates: true });
  if (error) throw new Error("Warranty export state could not be saved.");

  return createWarrantyLink(input);
}
