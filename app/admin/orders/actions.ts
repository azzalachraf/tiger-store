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
  revalidatePath("/admin", "layout");
}

export async function deleteOrderAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (id) {
    const { deleteOrder } = await import("@/lib/admin-store");
    await deleteOrder(id);
    revalidatePath("/admin", "layout");
  }
}

export async function addManualOrderAction(formData: FormData) {
  await requireAdmin();
  const total = Number(formData.get("total") ?? 0);
  const status = String(formData.get("status") ?? "paid") as AdminOrderStatus;
  const customerName = String(formData.get("customerName") ?? "Manual Order");
  const notes = String(formData.get("notes") ?? "");

  const order: AdminOrder = {
    id: crypto.randomUUID(),
    customerName,
    phone: "",
    email: "",
    products: [],
    paymentMethod: "CCP", // default
    total,
    notes,
    status,
    createdAt: new Date().toISOString(),
  };

  await saveOrder(order);
  revalidatePath("/admin", "layout");
}
