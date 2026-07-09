"use server";

import { revalidatePath } from "next/cache";
import { saveMarketingConfig } from "@/lib/marketing-store";
import { requireAdmin } from "@/lib/admin-auth";

export async function saveMarketingConfigAction(formData: FormData) {
  await requireAdmin();

  const meta_pixel_id = formData.get("meta_pixel_id")?.toString() || undefined;
  const meta_pixel_enabled = formData.get("meta_pixel_enabled") === "on";
  
  const meta_capi_token = formData.get("meta_capi_token")?.toString() || undefined;
  const meta_capi_enabled = formData.get("meta_capi_enabled") === "on";

  await saveMarketingConfig({
    meta_pixel_id,
    meta_pixel_enabled,
    meta_capi_token,
    meta_capi_enabled,
  });

  revalidatePath("/admin", "layout");
}
