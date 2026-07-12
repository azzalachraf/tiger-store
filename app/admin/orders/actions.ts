"use server";

import { revalidatePath } from "next/cache";
import { getOrderById, saveOrder } from "@/lib/admin-store";
import { AdminOrder, PaymentMethodId } from "@/lib/types";
import { requireAdmin } from "@/lib/admin-auth";
import { orderStatusSchema, paymentMethodSchema } from "@/lib/validation";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveOrderStatusAction(formData: FormData) {
  await requireAdmin();

  const id = text(formData, "id");
  const existingOrder = id ? await getOrderById(id) : undefined;
  if (!existingOrder) throw new Error("Order not found.");

  const order: AdminOrder = {
    ...existingOrder,
    status: orderStatusSchema.parse(text(formData, "status") || existingOrder.status),
    adminNotes: text(formData, "adminNotes"),
  };

  await saveOrder(order);
  revalidatePath("/admin", "layout");
}

export async function deleteOrderAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (id) {
    const { deleteOrder } = await import("@/lib/admin-store");
    await deleteOrder(id);
    revalidatePath("/admin", "layout");
  }
}

export async function addManualOrderAction(formData: FormData) {
  await requireAdmin();
  const total = Number(formData.get("total") ?? 0);
  const status = orderStatusSchema.parse(text(formData, "status") || "paid");
  const customerName = text(formData, "customerName") || "Manual Order";
  const notes = text(formData, "notes");
  const paymentMethod = paymentMethodSchema.catch("CCP" as PaymentMethodId).parse(text(formData, "paymentMethod") || "CCP");

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Manual order total must be greater than 0.");
  }

  const order: AdminOrder = {
    id: crypto.randomUUID(),
    customerName,
    phone: "",
    email: "",
    products: [],
    paymentMethod,
    total,
    notes,
    status,
    createdAt: new Date().toISOString(),
  };

  await saveOrder(order);
  revalidatePath("/admin", "layout");
}
