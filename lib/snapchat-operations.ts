import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";
import { decryptRedeemCode, encryptRedeemCode, redeemCodeHash, snapchatCardTypes, type SnapchatCardType, type SnapchatPlanMonths } from "@/lib/snapchat-cards";
import { readRedeemCardsSheet } from "@/lib/google-redeem-sheet";
import { readAll } from "@/lib/read-all";

type ClaimRow = { operation_id: string; card_id: string; code_ciphertext: string };
type StoredRedeemCardRow = { id: string; code_ciphertext: string; status: "available" | "reserved" | "consumed" | "disabled"; source_available: boolean; redeemed_permanently: boolean | null };

const uploadSessionLifetimeMs = 30 * 60 * 1000;

export async function startTelegramRedeemCardUploadSession(telegramUserId: string, cardType: SnapchatCardType) {
  const { error } = await getSupabaseServiceClient().from("telegram_redeem_upload_sessions").upsert({
    telegram_user_id: telegramUserId,
    card_type: cardType,
    expires_at: new Date(Date.now() + uploadSessionLifetimeMs).toISOString(),
  }, { onConflict: "telegram_user_id" });
  if (error) throw new Error("Card upload session could not be started.");
}

export async function getTelegramRedeemCardUploadSession(telegramUserId: string): Promise<SnapchatCardType | null> {
  const client = getSupabaseServiceClient();
  const { data, error } = await client.from("telegram_redeem_upload_sessions").select("card_type, expires_at").eq("telegram_user_id", telegramUserId).maybeSingle();
  if (error) throw new Error("Card upload session could not be read.");
  if (!data) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    await client.from("telegram_redeem_upload_sessions").delete().eq("telegram_user_id", telegramUserId);
    return null;
  }
  return snapchatCardTypes.includes(data.card_type as SnapchatCardType) ? data.card_type as SnapchatCardType : null;
}

export async function clearTelegramRedeemCardUploadSession(telegramUserId: string) {
  const { error } = await getSupabaseServiceClient().from("telegram_redeem_upload_sessions").delete().eq("telegram_user_id", telegramUserId);
  if (error) throw new Error("Card upload session could not be cleared.");
}

export async function syncRedeemInventory() {
  const cards = await readRedeemCardsSheet();
  const client = getSupabaseServiceClient();
  let synchronized = 0;
  for (const card of cards) {
    const { error } = await client.rpc("sync_redeem_card_from_sheet", {
      p_code_hash: redeemCodeHash(card.code), p_code_ciphertext: encryptRedeemCode(card.code), p_card_type: card.cardType, p_source_row_key: card.sourceRowKey, p_source_available: card.available,
    });
    if (error) throw new Error("Inventory synchronization could not be saved.");
    synchronized += 1;
  }
  const { data, error } = await readAll(client.from("redeem_cards").select("card_type").eq("status", "available").eq("source_available", true).order("id"));
  if (error) throw new Error("Inventory stock could not be read.");
  const availableCards = (data ?? []) as { card_type: SnapchatCardType }[];
  const counts = availableCards.reduce<Partial<Record<SnapchatCardType, number>>>((result, item) => ({ ...result, [item.card_type]: (result[item.card_type] ?? 0) + 1 }), {});
  for (const cardType of snapchatCardTypes) counts[cardType] ??= 0;
  return { synchronized, counts };
}

/**
 * Owner-only callers import codes from a private Telegram message or the
 * protected website inventory panel. Codes are encrypted before persistence
 * and are never returned from this function.
 */
export async function uploadRedeemCardsFromTelegram(cardType: SnapchatCardType, codes: string[]) {
  const client = getSupabaseServiceClient();
  const hashes = codes.map(redeemCodeHash);
  const { data: existing, error: readError } = await client.from("redeem_cards").select("id, code_hash, card_type, status, source_available, redeemed_permanently").in("code_hash", hashes);
  if (readError) throw new Error("Inventory could not be read.");
  const existingRows = (existing ?? []) as { id: string; code_hash: string; card_type: SnapchatCardType; status: "available" | "reserved" | "consumed" | "disabled"; source_available: boolean; redeemed_permanently: boolean | null }[];
  const existingByHash = new Map(existingRows.map((row) => [row.code_hash, row]));
  const consumedIds = existingRows.filter((row) => row.status === "consumed").map((row) => row.id);
  const { data: completedOperations, error: completedOperationsError } = consumedIds.length
    ? await client.from("snapchat_operations").select("redeem_card_id").in("redeem_card_id", consumedIds).eq("status", "completed")
    : { data: [], error: null };
  if (completedOperationsError) throw new Error("Card history could not be read.");
  const completedCardIds = new Set((completedOperations ?? []).map((operation) => String(operation.redeem_card_id)));
  const newCodes = codes.filter((code) => !existingByHash.has(redeemCodeHash(code)));
  const restorableCodes = codes.filter((code) => {
    const existingCard = existingByHash.get(redeemCodeHash(code));
    return Boolean(existingCard && existingCard.redeemed_permanently === false && existingCard.card_type === cardType && existingCard.status === "consumed" && existingCard.source_available && !completedCardIds.has(existingCard.id));
  });
  if (newCodes.length) {
    const { error } = await client.from("redeem_cards").upsert(newCodes.map((code) => ({
      code_hash: redeemCodeHash(code),
      code_ciphertext: encryptRedeemCode(code),
      card_type: cardType,
      source_row_key: `telegram:${crypto.randomUUID()}`,
      source_available: true,
      status: "available",
    })), { onConflict: "code_hash", ignoreDuplicates: true });
    if (error) throw new Error("Inventory could not be saved.");
  }
  if (restorableCodes.length) {
    const restoredIds = restorableCodes.map((code) => existingByHash.get(redeemCodeHash(code))?.id).filter((id): id is string => Boolean(id));
    const { error } = await client.from("redeem_cards")
      .update({ status: "available", consumed_at: null })
      .in("id", restoredIds)
      .eq("status", "consumed")
      .eq("redeemed_permanently", false)
      .eq("source_available", true);
    if (error) throw new Error("Manually used cards could not be restored.");
  }
  const { data, error } = await readAll(client.from("redeem_cards").select("card_type").eq("status", "available").eq("source_available", true).order("id"));
  if (error) throw new Error("Inventory stock could not be read.");
  const availableCards = (data ?? []) as { card_type: SnapchatCardType }[];
  const counts = availableCards.reduce<Partial<Record<SnapchatCardType, number>>>((result, item) => ({ ...result, [item.card_type]: (result[item.card_type] ?? 0) + 1 }), {});
  for (const type of snapchatCardTypes) counts[type] ??= 0;
  return { added: newCodes.length, restored: restorableCodes.length, duplicates: codes.length - newCodes.length - restorableCodes.length, counts };
}

/** Mark an unassigned card as used when it was redeemed outside an operation.
 * Reserved cards are deliberately excluded: their active operation must be
 * completed or cancelled through the normal workflow. */
export async function markAvailableRedeemCardUsed(cardId: string) {
  const { data, error } = await getSupabaseServiceClient()
    .from("redeem_cards")
    .update({ status: "consumed", consumed_at: new Date().toISOString() })
    .eq("id", cardId)
    .eq("status", "available")
    .eq("source_available", true)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Only an available card can be marked used.");
}

/** Remove an unused card entered by mistake. Assigned or used codes keep their
 * audit history and can never be removed from this control. */
export async function removeAvailableRedeemCard(cardId: string) {
  const { data, error } = await getSupabaseServiceClient()
    .from("redeem_cards")
    .delete()
    .eq("id", cardId)
    .eq("status", "available")
    .eq("source_available", true)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Only an available card can be removed.");
}

/** Owner-only bulk cleanup for cards that have never been assigned. Reserved
 * and consumed cards are deliberately kept for operational history. */
export async function clearAvailableRedeemCards(cardType: SnapchatCardType) {
  const { data, error } = await getSupabaseServiceClient()
    .from("redeem_cards")
    .delete()
    .eq("card_type", cardType)
    .eq("status", "available")
    .eq("source_available", true)
    .select("id");
  if (error) throw new Error("Available card stock could not be cleared.");
  return { deleted: data?.length ?? 0 };
}

/** Cards consumed through a completed Snapchat operation are never restored.
 * This only reverses a manual "mark used" action for a card that has never
 * been assigned to a completed operation. */
export async function restoreManuallyUsedRedeemCard(cardId: string) {
  const client = getSupabaseServiceClient();
  const { data: card, error: cardError } = await client
    .from("redeem_cards")
    .select("id, status, source_available, redeemed_permanently")
    .eq("id", cardId)
    .maybeSingle();
  if (cardError || !card || card.redeemed_permanently !== false || card.status !== "consumed" || !card.source_available) throw new Error("This card cannot be restored.");

  const { data: completedOperation, error: operationError } = await client
    .from("snapchat_operations")
    .select("id")
    .eq("redeem_card_id", cardId)
    .eq("status", "completed")
    .maybeSingle();
  if (operationError || completedOperation) throw new Error("Completed operation cards cannot be restored.");

  const { data: restored, error: restoreError } = await client
    .from("redeem_cards")
    .update({ status: "available", consumed_at: null })
    .eq("id", cardId)
    .eq("status", "consumed")
    .select("id")
    .maybeSingle();
  if (restoreError || !restored) throw new Error("This card could not be restored.");
}

/** Private owner/admin inventory view. Callers must protect the result: it
 * decrypts codes only after application-level authentication. */
export async function getPrivateRedeemCards(cardType: SnapchatCardType) {
  const client = getSupabaseServiceClient();
  const { data, error } = await readAll(client
    .from("redeem_cards")
    .select("id, code_ciphertext, status, source_available, redeemed_permanently")
    .eq("card_type", cardType)
    .order("created_at", { ascending: false }).order("id"));
  if (error) throw new Error("Card stock could not be read.");
  const rows = (data ?? []) as StoredRedeemCardRow[];
  const ids = rows.filter((row) => row.status === "consumed").map((row) => row.id);
  const completedIds = new Set<string>();
  if (ids.length) {
    const { data: operations, error: operationError } = await client
      .from("snapchat_operations")
      .select("redeem_card_id")
      .in("redeem_card_id", ids)
      .eq("status", "completed");
    if (operationError) throw new Error("Card history could not be read.");
    for (const operation of operations ?? []) completedIds.add(String(operation.redeem_card_id));
  }
  return rows.map((row) => ({
    id: row.id,
    code: decryptRedeemCode(row.code_ciphertext),
    status: row.status,
    canRestore: row.redeemed_permanently === false && row.status === "consumed" && row.source_available && !completedIds.has(row.id),
  }));
}

export async function claimSnapchatCard(adminTelegramUserId: string, planMonths: SnapchatPlanMonths, cardType: SnapchatCardType, websiteOrderId?: string) {
  const { data, error } = websiteOrderId
    ? await getSupabaseServiceClient().rpc("claim_website_card", { p_order: websiteOrderId, p_admin: adminTelegramUserId, p_plan: planMonths, p_card: cardType })
    : await getSupabaseServiceClient().rpc("claim_snapchat_redeem_card", { p_admin_telegram_user_id: adminTelegramUserId, p_plan_months: planMonths, p_card_type: cardType });
  const row = (data as unknown as ClaimRow[] | null)?.[0];
  if (error || !row) throw new Error("No code is currently available for this card type.");
  return { operationId: row.operation_id, code: decryptRedeemCode(row.code_ciphertext) };
}

export async function finishSnapchatOperation(operationId: string, adminTelegramUserId: string, outcome: "completed" | "cancelled") {
  const { data, error } = await getSupabaseServiceClient().rpc("finish_snapchat_operation", { p_operation_id: operationId, p_admin_telegram_user_id: adminTelegramUserId, p_outcome: outcome });
  if (error || data !== true) throw new Error("This operation is unavailable.");
}

export async function quarantineUsedCardAndClaimReplacement(operationId: string, adminTelegramUserId: string) {
  const client = getSupabaseServiceClient();
  const { data: operation, error } = await client.from("snapchat_operations").select("plan_months, card_type").eq("id", operationId).eq("admin_telegram_user_id", adminTelegramUserId).eq("status", "active").maybeSingle();
  if (error || !operation) throw new Error("This operation is unavailable.");
  await finishSnapchatOperation(operationId, adminTelegramUserId, "completed");
  const { error: relabelError } = await client.from("snapchat_operations").update({ status: "cancelled", completed_at: null, cancelled_at: new Date().toISOString() }).eq("id", operationId).eq("admin_telegram_user_id", adminTelegramUserId).eq("status", "completed");
  if (relabelError) throw new Error("The used card was secured but the operation needs review.");
  try { return await claimSnapchatCard(adminTelegramUserId, Number(operation.plan_months) as SnapchatPlanMonths, operation.card_type as SnapchatCardType); }
  catch { return null; }
}

/** Owner-only recovery for a card that is still reserved in an active operation.
 * The code itself is never returned or logged. Completed cards are deliberately
 * excluded because a code that may have been redeemed must never be reissued. */
export async function returnReservedRedeemCardToStock(code: string) {
  const client = getSupabaseServiceClient();
  const { data: card, error: cardError } = await client
    .from("redeem_cards")
    .select("id, card_type, status")
    .eq("code_hash", redeemCodeHash(code))
    .maybeSingle();
  if (cardError || !card || card.status !== "reserved") throw new Error("Reserved card unavailable.");

  const { data: operation, error: operationError } = await client
    .from("snapchat_operations")
    .select("id")
    .eq("redeem_card_id", card.id)
    .eq("status", "active")
    .maybeSingle();
  if (operationError || !operation) throw new Error("Active operation unavailable.");

  const { error: operationUpdateError } = await client
    .from("snapchat_operations")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", operation.id)
    .eq("status", "active");
  if (operationUpdateError) throw new Error("Operation could not be cancelled.");

  const { data: restored, error: restoreError } = await client
    .from("redeem_cards")
    .update({ status: "available", reserved_at: null, consumed_at: null })
    .eq("id", card.id)
    .eq("status", "reserved")
    .select("id")
    .maybeSingle();
  if (restoreError || !restored) throw new Error("Card could not be restored.");

  return { cardId: String(card.id), cardType: card.card_type as SnapchatCardType, operationId: String(operation.id) };
}
