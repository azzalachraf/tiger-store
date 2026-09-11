"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrderById, getProductBySlug } from "@/lib/admin-store";
import { getLegacyClaim, legacyClaimHash } from "@/lib/legacy-warranty-claim";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { directWarrantyClaimSchema } from "@/lib/validation";
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
  if (await getLegacyClaim(token)) redirect(`/warranty/${token}`);
  const recipientName = `${String(formData.get("firstName") ?? "").trim()} ${String(formData.get("familyName") ?? "").trim()}`.trim();
  const claim = directWarrantyClaimSchema.parse({ recipientName, phone: formData.get("phone"), email: formData.get("email"), accepted: formData.get("accepted") });
  const phone = normalizeAlgerianPhone(claim.phone);
  if (!phone) throw new Error("A valid Algerian phone number is required.");
  let directOrder: AdminOrder | null = null;
  if (payload.source === "direct") {
    const product = await getProductBySlug(payload.slug);
    const offer = product ? findOffer(product, payload.optionId) : undefined;
    if (!product || !offer) throw new Error("Warranty is not available for this product.");
    const orderId = directWarrantyOrderId(payload);
    const existingOrder = await getOrderById(orderId);
    if (!existingOrder) {
      const item: CartItem = { id: `${product.id}:${offer.id}`, productId: product.id, slug: product.slug, name: product.name, nameAr: product.nameAr, image: product.image, option: offer.label, optionId: offer.id, optionAr: offer.labelAr, duration: offer.duration, durationAr: offer.durationAr, price: payload.amountPaid, quantity: 1 };
      const order: AdminOrder = { id: orderId, customerName: claim.recipientName, phone, email: claim.email, products: [item], paymentMethod: payload.paymentMethod, total: payload.amountPaid, notes: "Off-site sale: warranty certificate issued by customer link.", status: "delivered", createdAt: payload.issuedAt, adminNotes: "Created from a direct warranty link." };
      directOrder = order;
      revalidatePath("/admin", "layout");
    }
  } else {
    const order = await getOrderById(payload.orderId);
    if (!order || order.status !== "delivered" || !order.products[payload.itemIndex]) throw new Error("Warranty is not available for this order.");
    revalidatePath("/admin", "layout");
  }
  const { data: storedName, error } = await getSupabaseServiceClient().rpc("claim_legacy_warranty", {
    p_hash: legacyClaimHash(token), p_order_id: payload.source === "direct" ? directWarrantyOrderId(payload) : payload.orderId,
    p_name: claim.recipientName, p_phone: phone, p_email: claim.email, p_direct_order: directOrder,
  });
  if (error) throw new Error("Warranty claim could not be saved.");
  (await cookies()).set(warrantyClaimCookieName(token), createWarrantyClaimCookie(payload, String(storedName)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/warranty/${token}`,
    maxAge: 7 * 24 * 60 * 60,
  });
  redirect(`/warranty/${token}?issued=1`);
}
