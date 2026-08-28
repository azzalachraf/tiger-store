"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrderById, getProductBySlug, saveOrder } from "@/lib/admin-store";
import { directWarrantyClaimSchema, warrantyClaimSchema } from "@/lib/validation";
import type { AdminOrder, CartItem, Product, ProductPriceOption } from "@/lib/types";
import { createWarrantyClaimCookie, directWarrantyOrderId, verifyWarrantyLink, warrantyClaimCookieName } from "@/lib/warranty";
import { normalizeAlgerianPhone } from "@/lib/stock-alerts";

function findOffer(product: Product, optionId: string): ProductPriceOption | undefined {
  if (product.priceOptions?.length) return product.priceOptions.find((option) => option.id === optionId);
  const fallback: ProductPriceOption = { id: `${product.id}:default`, label: product.duration, labelAr: product.durationAr, duration: product.duration, durationAr: product.durationAr, price: product.price, oldPrice: product.oldPrice, available: product.available };
  return fallback.id === optionId ? fallback : undefined;
}

export async function claimWarrantyCertificateAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const payload = verifyWarrantyLink(token);
  if (!payload) throw new Error("Invalid warranty link.");
  const claimBase = { recipientName: formData.get("recipientName"), accepted: formData.get("accepted") };
  if (payload.source === "direct") {
    const claim = directWarrantyClaimSchema.parse({ ...claimBase, phone: formData.get("phone") });
    const phone = normalizeAlgerianPhone(claim.phone);
    const product = await getProductBySlug(payload.slug);
    const offer = product ? findOffer(product, payload.optionId) : undefined;
    if (!phone || !product || !offer) throw new Error("Warranty is not available for this product.");
    const orderId = directWarrantyOrderId(payload);
    const existingOrder = await getOrderById(orderId);
    if (!existingOrder) {
      const item: CartItem = { id: `${product.id}:${offer.id}`, productId: product.id, slug: product.slug, name: product.name, nameAr: product.nameAr, image: product.image, option: offer.label, optionId: offer.id, optionAr: offer.labelAr, duration: offer.duration, durationAr: offer.durationAr, price: payload.amountPaid, quantity: 1 };
      const order: AdminOrder = { id: orderId, customerName: claim.recipientName, phone, email: "", products: [item], paymentMethod: payload.paymentMethod, total: payload.amountPaid, notes: "Off-site sale: warranty certificate issued by customer link.", status: "delivered", createdAt: payload.issuedAt, adminNotes: "Created from a direct warranty link." };
      await saveOrder(order);
      revalidatePath("/admin", "layout");
    }
  } else {
    const claim = warrantyClaimSchema.parse(claimBase);
    const order = await getOrderById(payload.orderId);
    if (!order || order.status !== "delivered" || !order.products[payload.itemIndex]) throw new Error("Warranty is not available for this order.");
    // Keep the name used on the certificate only; the original order stays immutable.
    void claim;
  }
  const recipientName = String(claimBase.recipientName ?? "").trim();
  (await cookies()).set(warrantyClaimCookieName(token), createWarrantyClaimCookie(payload, recipientName), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/warranty/${token}`,
    maxAge: 7 * 24 * 60 * 60,
  });
  redirect(`/warranty/${token}?issued=1`);
}
