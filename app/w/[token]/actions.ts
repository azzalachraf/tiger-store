"use server";
import { redirect } from "next/navigation";
import { normalizeAlgerianPhone } from "@/lib/stock-alerts";
import { telegramWarrantyFormSchema } from "@/lib/validation";
import { acknowledgeTelegramWarrantyBalance, submitTelegramWarranty } from "@/lib/telegram-warranty";
export async function submitTelegramWarrantyAction(formData: FormData) { const token = String(formData.get("token") ?? ""); const input = telegramWarrantyFormSchema.parse({ name: formData.get("name"), username: formData.get("username"), platform: formData.get("platform"), phone: formData.get("phone"), email: formData.get("email") }); const phone = normalizeAlgerianPhone(input.phone); if (!phone) throw new Error("Invalid phone number."); await submitTelegramWarranty(token, { ...input, phone }); redirect(`/w/${token}`); }
export async function acknowledgeBalanceAction(formData: FormData) { const token = String(formData.get("token") ?? ""); await acknowledgeTelegramWarrantyBalance(token); redirect(`/w/${token}`); }
