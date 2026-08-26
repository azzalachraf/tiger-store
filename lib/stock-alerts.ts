import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";

const recentRequests = new Map<string, number>();
const REQUEST_COOLDOWN_MS = 60_000;

export function normalizeAlgerianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("213") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  if (!/^[5-7]\d{8}$/.test(national)) return null;
  return `+213${national}`;
}

export async function createStockAlert(input: { productId: string; optionId?: string; phone: string }) {
  const phone = normalizeAlgerianPhone(input.phone);
  if (!phone) throw new Error("Enter a valid Algerian mobile number.");
  const key = `${input.productId}:${input.optionId ?? "default"}:${phone}`;
  const now = Date.now();
  if ((recentRequests.get(key) ?? 0) + REQUEST_COOLDOWN_MS > now) {
    return { created: false, duplicate: true };
  }
  recentRequests.set(key, now);

  const supabase = getSupabaseServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from("stock_alerts")
    .select("id")
    .eq("product_id", input.productId)
    .eq("option_id", input.optionId ?? "default")
    .eq("phone", phone)
    .eq("status", "pending")
    .maybeSingle();
  if (existingError) throw new Error("Unable to save the availability alert.");
  if (existing) return { created: false, duplicate: true };

  const { error } = await supabase.from("stock_alerts").insert({
    id: crypto.randomUUID(),
    product_id: input.productId,
    option_id: input.optionId ?? "default",
    phone,
    status: "pending",
  });
  if (error) throw new Error("Unable to save the availability alert.");
  return { created: true, duplicate: false };
}
