"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getOrderById } from "@/lib/admin-store";
import { warrantyClaimSchema } from "@/lib/validation";
import { createWarrantyClaimCookie, verifyWarrantyLink, warrantyClaimCookieName } from "@/lib/warranty";

export async function claimWarrantyCertificateAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const payload = verifyWarrantyLink(token);
  if (!payload) throw new Error("Invalid warranty link.");
  const claim = warrantyClaimSchema.parse({ recipientName: formData.get("recipientName"), accepted: formData.get("accepted") });
  const order = await getOrderById(payload.orderId);
  if (!order || order.status !== "delivered" || !order.products[payload.itemIndex]) throw new Error("Warranty is not available for this order.");
  (await cookies()).set(warrantyClaimCookieName(token), createWarrantyClaimCookie(payload, claim.recipientName), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/warranty/${token}`,
    maxAge: 7 * 24 * 60 * 60,
  });
  redirect(`/warranty/${token}?issued=1`);
}
