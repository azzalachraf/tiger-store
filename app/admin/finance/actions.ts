"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin-auth";
import { adminFinanceAdjustmentSchema, adminPaymentSchema, adminPaymentScheduleSchema, advertisingSpendSchema, financeSettingsSchema } from "@/lib/validation";
import { saveFinanceSettings, type FinanceSettings } from "@/lib/finance";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { snapchatCardTypes, type SnapchatCardType } from "@/lib/snapchat-cards";

const form = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
export async function saveFinanceSettingsAction(formData: FormData) {
  await requireAdminAction();
  const raw = financeSettingsSchema.parse({ usdDzdRate: form(formData, "usdDzdRate"), paymentDay: form(formData, "paymentDay"), reportingSheetId: form(formData, "reportingSheetId"), plans: [1, 2, 3, 6, 12].map((months) => ({ months, priceDzd: form(formData, `price-${months}`), commissionDzd: form(formData, `commission-${months}`) })), cardCosts: snapchatCardTypes.map((cardType) => ({ cardType, usdCents: form(formData, `cost-${cardType}`) })) });
  const settings: FinanceSettings = { usdDzdRate: raw.usdDzdRate, paymentDay: raw.paymentDay, reportingSheetId: raw.reportingSheetId, plans: Object.fromEntries(raw.plans.map((plan) => [plan.months, { priceDzd: plan.priceDzd, commissionDzd: plan.commissionDzd }])) as FinanceSettings["plans"], cardCostsUsdCents: Object.fromEntries(raw.cardCosts.map((cost) => [cost.cardType, cost.usdCents])) as Record<SnapchatCardType, number> };
  await saveFinanceSettings(settings);
  revalidatePath("/admin/finance");
}
export async function addAdminAdjustmentAction(formData: FormData) { await requireAdminAction(); const input = adminFinanceAdjustmentSchema.parse({ adminId: form(formData, "adminId"), amountDzd: form(formData, "amountDzd"), reason: form(formData, "reason") }); const { error } = await getSupabaseServiceClient().from("financial_adjustments").insert({ recipient_telegram_user_id: input.adminId, amount_dzd: input.amountDzd, reason: input.reason }); if (error) throw new Error("Adjustment could not be saved."); revalidatePath("/admin/finance"); }
export async function markAdminPaidAction(formData: FormData) { await requireAdminAction(); const input = adminPaymentSchema.parse({ adminId: form(formData, "adminId"), amountDzd: form(formData, "amountDzd"), note: form(formData, "note") }); const { error } = await getSupabaseServiceClient().from("admin_payments").insert({ admin_telegram_user_id: input.adminId, amount_dzd: input.amountDzd, note: input.note }); if (error) throw new Error("Payment could not be saved."); revalidatePath("/admin/finance"); }
export async function saveAdminPaymentScheduleAction(formData: FormData) { await requireAdminAction(); const input = adminPaymentScheduleSchema.parse({ adminId: form(formData, "adminId"), workStartedAt: form(formData, "workStartedAt"), nextPaymentDate: form(formData, "nextPaymentDate") }); const { error } = await getSupabaseServiceClient().from("telegram_users").update({ work_started_at: input.workStartedAt, next_payment_date: input.nextPaymentDate }).eq("telegram_user_id", input.adminId).in("role", ["owner", "admin"]); if (error) throw new Error("Payment schedule could not be saved."); revalidatePath("/admin/finance"); }
export async function recordAdvertisingSpendAction(formData: FormData) { await requireAdminAction(); const input = advertisingSpendSchema.parse({ spentOn: form(formData, "spentOn"), platform: form(formData, "platform"), campaign: form(formData, "campaign"), amountDzd: form(formData, "amountDzd"), note: form(formData, "note") }); const { error } = await getSupabaseServiceClient().from("advertising_spend").insert({ spend_date: input.spentOn, platform: input.platform, campaign: input.campaign, amount_dzd: input.amountDzd, note: input.note }); if (error) throw new Error("Advertising spend could not be saved."); revalidatePath("/admin/finance"); }
