"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireAdminAction } from "@/lib/admin-auth";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";
import {
  telegramDisplayNameSchema,
  telegramUserIdSchema,
} from "@/lib/validation";

export async function renameTelegramAdminAction(formData: FormData) {
  await requireAdmin();
  const telegramUserId = telegramUserIdSchema.parse(
    String(formData.get("telegramUserId") ?? ""),
  );
  const displayName = telegramDisplayNameSchema.parse(
    String(formData.get("displayName") ?? ""),
  );
  const { error } = await getSupabaseServiceClient()
    .from("telegram_users")
    .update({ first_name: displayName })
    .eq("telegram_user_id", telegramUserId)
    .in("role", ["admin", "owner"]);
  if (error) throw new Error("The team member could not be renamed.");
  revalidatePath("/admin/team");
}

export async function disableTelegramAdminAction(formData: FormData) {
  await requireAdminAction();
  const id = telegramUserIdSchema.parse(
    String(formData.get("telegramUserId") ?? ""),
  );
  if (id === getServerEnv().TELEGRAM_OWNER_ID)
    throw new Error("The owner cannot be disabled.");
  const client = getSupabaseServiceClient();
  const { count, error: activeError } = await client
    .from("snapchat_operations")
    .select("id", { count: "exact", head: true })
    .eq("admin_telegram_user_id", id)
    .eq("status", "active");
  if (activeError || count === null || count === undefined || count > 0)
    throw new Error(
      "Complete or cancel active operations before disabling this admin.",
    );
  // Reuse the existing access gate. Keep the user and every financial/operational record.
  // Re-enabling requires the owner's existing Telegram approval workflow.
  const { data, error } = await client
    .from("telegram_users")
    .update({
      role: "pending",
      approved_at: null,
      approved_by_telegram_user_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("telegram_user_id", id)
    .eq("role", "admin")
    .select("telegram_user_id");
  if (error || !data?.length)
    throw new Error("Admin access was not changed. Owners cannot be disabled.");
  revalidatePath("/admin/team");
  revalidatePath("/admin/finance");
}
