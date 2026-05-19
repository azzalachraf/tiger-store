"use server";

import { revalidatePath } from "next/cache";
import { saveOrder } from "@/lib/admin-store";
import { AdminOrder, AdminOrderStatus } from "@/lib/types";
import { requireAdmin } from "@/lib/admin-auth";

export async function saveOrderStatusAction(formData: FormData) {
  await requireAdmin();

  const order: AdminOrder = JSON.parse(String(formData.get("order") ?? "{}"));
  order.status = String(formData.get("status") ?? order.status) as AdminOrderStatus;
  order.adminNotes = String(formData.get("adminNotes") ?? "");

  await saveOrder(order);
  revalidatePath("/admin/orders");
}
