"use server";

import { revalidatePath } from "next/cache";
import { getOrderById, getProductBySlug, saveOrder } from "@/lib/admin-store";
import { AdminOrder, PaymentMethodId, Product, ProductPriceOption } from "@/lib/types";
import { requireAdmin } from "@/lib/admin-auth";
import { orderStatusSchema, paymentMethodSchema, productCheckoutLinkIssueSchema, warrantyIssueSchema } from "@/lib/validation";
import { createWarrantyLink } from "@/lib/warranty";
import { createProductCheckoutLink } from "@/lib/product-checkout-link";
import { redirect } from "next/navigation";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function findOffer(product: Product, optionId: string): ProductPriceOption | undefined {
  if (product.priceOptions?.length) return product.priceOptions.find((option) => option.id === optionId);
  const fallback: ProductPriceOption = { id: `${product.id}:default`, label: product.duration, labelAr: product.durationAr, duration: product.duration, durationAr: product.durationAr, price: product.price, oldPrice: product.oldPrice, available: product.available };
  return fallback.id === optionId ? fallback : undefined;
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
  const paymentMethod = paymentMethodSchema.catch("BaridiMob" as PaymentMethodId).parse(text(formData, "paymentMethod") || "BaridiMob");

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

export async function createWarrantyLinkAction(formData: FormData) {
  await requireAdmin();
  const input = warrantyIssueSchema.parse({
    orderId: text(formData, "orderId"),
    itemIndex: text(formData, "itemIndex"),
    coveredDays: text(formData, "coveredDays"),
  });
  const order = await getOrderById(input.orderId);
  if (!order || order.status !== "delivered" || !order.products[input.itemIndex]) {
    throw new Error("A warranty link can only be issued for a delivered order item.");
  }
  const token = createWarrantyLink(input);
  redirect(`/admin/orders?warranty=${encodeURIComponent(token)}`);
}

export async function createProductCheckoutLinkAction(formData: FormData) {
  await requireAdmin();
  const input = productCheckoutLinkIssueSchema.parse({
    slug: text(formData, "slug"),
    optionId: text(formData, "optionId"),
  });
  const product = await getProductBySlug(input.slug);
  const offer = product ? findOffer(product, input.optionId) : undefined;
  if (!product || !product.available || !offer || offer.available === false || offer.price <= 0) throw new Error("The selected product plan is no longer available.");
  const token = createProductCheckoutLink(input);
  redirect(`/admin/orders?checkout=${encodeURIComponent(token)}`);
}
