import "server-only";
import { createHash } from "node:crypto";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import { directWarrantyOrderId, verifyWarrantyLink, verifyWarrantyClaimCookie, warrantyClaimCookieName } from "@/lib/warranty";
export function legacyClaimHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function getLegacyClaim(token: string) {
  const { data, error } = await getSupabaseServiceClient().from("legacy_warranty_claims")
    .select("recipient_name").eq("token_hash", legacyClaimHash(token)).maybeSingle();
  if (error) throw new Error("Certificate state unavailable.");
  if (data?.recipient_name) return String(data.recipient_name);
  const payload = verifyWarrantyLink(token);
  if (!payload) return undefined;
  const oldName = verifyWarrantyClaimCookie(payload, (await cookies()).get(warrantyClaimCookieName(token))?.value);
  if (!oldName) return undefined;
  const orderId = payload.source === "direct" ? directWarrantyOrderId(payload) : payload.orderId;
  const client = getSupabaseServiceClient();
  const { data: order } = await client.from("orders").select("phone,email").eq("id", orderId).eq("status", "delivered").maybeSingle();
  if (!order) return undefined;
  const migrated = await client.rpc("claim_legacy_warranty", { p_hash: legacyClaimHash(token), p_order_id: orderId, p_name: oldName, p_phone: order.phone, p_email: order.email, p_direct_order: null });
  if (migrated.error) throw new Error("Certificate state unavailable.");
  return String(migrated.data);
}
