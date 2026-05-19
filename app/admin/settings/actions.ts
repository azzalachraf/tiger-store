"use server";

import { revalidatePath } from "next/cache";
import { saveSettings } from "@/lib/admin-store";
import { SiteSettings } from "@/lib/types";
import { requireAdmin } from "@/lib/admin-auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveSettingsAction(formData: FormData) {
  await requireAdmin();

  const settings: SiteSettings = {
    whatsappNumber: text(formData, "whatsappNumber"),
    instagramUrl: text(formData, "instagramUrl"),
    facebookUrl: text(formData, "facebookUrl"),
    domainText: text(formData, "domainText"),
    baridiMobRip: text(formData, "baridiMobRip"),
    ccpDetails: text(formData, "ccpDetails"),
    redotPayDetails: text(formData, "redotPayDetails"),
    promoHeadings: text(formData, "promoHeadings").split("\n").map((line) => line.trim()).filter(Boolean),
    footerDisclaimer: text(formData, "footerDisclaimer"),
  };

  await saveSettings(settings);
  revalidatePath("/");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/payment-methods");
}
