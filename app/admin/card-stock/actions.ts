"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin-auth";
import { markAvailableRedeemCardUsed, removeAvailableRedeemCard, restoreManuallyUsedRedeemCard, uploadRedeemCardsFromTelegram } from "@/lib/snapchat-operations";
import { parseTelegramRedeemCardLines } from "@/lib/telegram-card-upload";
import { snapchatCardTypeSchema } from "@/lib/validation";

const cardIdSchema = z.string().uuid();

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function addRedeemCardsAction(formData: FormData) {
  await requireAdminAction();
  const cardType = snapchatCardTypeSchema.parse(text(formData, "cardType"));
  const codes = parseTelegramRedeemCardLines(cardType, text(formData, "codes"));
  await uploadRedeemCardsFromTelegram(cardType, codes);
  revalidatePath("/admin/card-stock");
}

export async function markRedeemCardUsedAction(formData: FormData) {
  await requireAdminAction();
  await markAvailableRedeemCardUsed(cardIdSchema.parse(text(formData, "cardId")));
  revalidatePath("/admin/card-stock");
}

export async function removeRedeemCardAction(formData: FormData) {
  await requireAdminAction();
  await removeAvailableRedeemCard(cardIdSchema.parse(text(formData, "cardId")));
  revalidatePath("/admin/card-stock");
}

export async function restoreRedeemCardAction(formData: FormData) {
  await requireAdminAction();
  await restoreManuallyUsedRedeemCard(cardIdSchema.parse(text(formData, "cardId")));
  revalidatePath("/admin/card-stock");
}
