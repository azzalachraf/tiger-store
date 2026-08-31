import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";

export type AdminCompensation = {
  mode: "salary" | "commission";
  commissionDzd: number;
};

const defaultCompensation: AdminCompensation = { mode: "commission", commissionDzd: 100 };

function keyFor(adminId: string) {
  if (!/^[1-9][0-9]{0,18}$/.test(adminId)) throw new Error("Invalid administrator.");
  return `admin_compensation_${adminId}`;
}

function parseCompensation(value: unknown): AdminCompensation {
  if (!value || typeof value !== "object") return defaultCompensation;
  const record = value as Record<string, unknown>;
  const mode = record.mode === "salary" ? "salary" : "commission";
  const commissionDzd = typeof record.commissionDzd === "number" && Number.isInteger(record.commissionDzd) && record.commissionDzd >= 0 && record.commissionDzd <= 100_000
    ? record.commissionDzd
    : defaultCompensation.commissionDzd;
  return mode === "salary" ? { mode, commissionDzd: 0 } : { mode, commissionDzd };
}

export async function getAdminCompensation(adminId: string): Promise<AdminCompensation> {
  const { data, error } = await getSupabaseServiceClient().from("business_settings").select("value").eq("key", keyFor(adminId)).maybeSingle();
  if (error) throw new Error("Administrator compensation could not be read.");
  return parseCompensation(data?.value);
}

export async function saveAdminCompensation(input: AdminCompensation & { adminId: string; updatedByTelegramUserId: string }) {
  const compensation = parseCompensation(input);
  const { error } = await getSupabaseServiceClient().from("business_settings").upsert({
    key: keyFor(input.adminId), value: compensation, updated_by_telegram_user_id: input.updatedByTelegramUserId,
  }, { onConflict: "key" });
  if (error) throw new Error("Administrator compensation could not be saved.");
  return compensation;
}

export async function getAdminCommissionDzd(adminId: string) {
  return (await getAdminCompensation(adminId)).commissionDzd;
}

type PendingCommissionInput = { adminId: string; expiresAt: string };

export async function startCustomCommissionInput(ownerId: string, adminId: string) {
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const { error } = await getSupabaseServiceClient().from("business_settings").upsert({
    key: `pending_commission_${ownerId}`, value: { adminId, expiresAt }, updated_by_telegram_user_id: ownerId,
  }, { onConflict: "key" });
  if (error) throw new Error("Commission input could not be started.");
}

export async function takeCustomCommissionInput(ownerId: string): Promise<string | null> {
  const key = `pending_commission_${ownerId}`;
  const client = getSupabaseServiceClient();
  const { data, error } = await client.from("business_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error("Commission input could not be read.");
  const value = data?.value as PendingCommissionInput | undefined;
  if (!value || !/^[1-9][0-9]{0,18}$/.test(value.adminId) || Number.isNaN(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= Date.now()) {
    if (data) await client.from("business_settings").delete().eq("key", key);
    return null;
  }
  return value.adminId;
}

export async function clearCustomCommissionInput(ownerId: string) {
  const { error } = await getSupabaseServiceClient().from("business_settings").delete().eq("key", `pending_commission_${ownerId}`);
  if (error) throw new Error("Commission input could not be cleared.");
}
