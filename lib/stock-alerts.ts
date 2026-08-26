import "server-only";

import { getProductBySlug } from "@/lib/admin-store";
import { getSupabaseServiceClient } from "@/lib/supabase";

const recentRequests = new Map<string, number>();
const REQUEST_COOLDOWN_MS = 60_000;

export function normalizeAlgerianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("213") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  if (!/^[5-7]\d{8}$/.test(national)) return null;
  return `+213${national}`;
}

export async function createStockAlert(input: { productSlug: string; optionId?: string; phone: string }) {
  const phone = normalizeAlgerianPhone(input.phone);
  if (!phone) throw new Error("Enter a valid Algerian mobile number.");
  const product = await getProductBySlug(input.productSlug);
  if (!product) throw new Error("This product is no longer available.");
  const option = product.priceOptions?.length
    ? product.priceOptions.find((item) => item.id === input.optionId)
    : { id: `${product.id}:default`, available: product.available };
  if (!option || (product.available && option.available !== false)) {
    throw new Error("Availability alerts can only be requested for unavailable offers.");
  }

  const key = `${product.id}:${option.id}:${phone}`;
  const now = Date.now();
  if ((recentRequests.get(key) ?? 0) + REQUEST_COOLDOWN_MS > now) {
    return { created: false, duplicate: true };
  }
  recentRequests.set(key, now);

  const supabase = getSupabaseServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from("stock_alerts")
    .select("id")
    .eq("product_id", product.id)
    .eq("option_id", option.id)
    .eq("phone", phone)
    .eq("status", "pending")
    .maybeSingle();
  if (existingError) throw new Error("Unable to save the availability alert.");
  if (existing) return { created: false, duplicate: true };

  const { error } = await supabase.from("stock_alerts").insert({
    id: crypto.randomUUID(),
    product_id: product.id,
    option_id: option.id,
    phone,
    status: "pending",
  });
  if (error) throw new Error("Unable to save the availability alert.");
  return { created: true, duplicate: false };
}
