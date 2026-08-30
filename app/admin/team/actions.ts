"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { telegramDisplayNameSchema, telegramUserIdSchema } from "@/lib/validation";

export async function renameTelegramAdminAction(formData: FormData) {
  await requireAdmin();
  const telegramUserId = telegramUserIdSchema.parse(String(formData.get("telegramUserId") ?? ""));
  const displayName = telegramDisplayNameSchema.parse(String(formData.get("displayName") ?? ""));
  const { error } = await getSupabaseServiceClient()
    .from("telegram_users")
    .update({ first_name: displayName })
    .eq("telegram_user_id", telegramUserId)
    .in("role", ["admin", "owner"]);
  if (error) throw new Error("The team member could not be renamed.");
  revalidatePath("/admin/team");
}
