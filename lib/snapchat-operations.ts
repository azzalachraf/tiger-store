import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";
import { decryptRedeemCode, encryptRedeemCode, redeemCodeHash, snapchatCardTypes, type SnapchatCardType, type SnapchatPlanMonths } from "@/lib/snapchat-cards";
import { readRedeemCardsSheet } from "@/lib/google-redeem-sheet";

type ClaimRow = { operation_id: string; card_id: string; code_ciphertext: string };

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
  const { data, error } = await client.from("redeem_cards").select("card_type").eq("status", "available").eq("source_available", true);
  if (error) throw new Error("Inventory stock could not be read.");
  const availableCards = (data ?? []) as { card_type: SnapchatCardType }[];
  const counts = availableCards.reduce<Partial<Record<SnapchatCardType, number>>>((result, item) => ({ ...result, [item.card_type]: (result[item.card_type] ?? 0) + 1 }), {});
  for (const cardType of snapchatCardTypes) counts[cardType] ??= 0;
  return { synchronized, counts };
}

export async function claimSnapchatCard(adminTelegramUserId: string, planMonths: SnapchatPlanMonths, cardType: SnapchatCardType) {
  const { data, error } = await getSupabaseServiceClient().rpc("claim_snapchat_redeem_card", { p_admin_telegram_user_id: adminTelegramUserId, p_plan_months: planMonths, p_card_type: cardType });
  const row = (data as unknown as ClaimRow[] | null)?.[0];
  if (error || !row) throw new Error("No code is currently available for this card type.");
  return { operationId: row.operation_id, code: decryptRedeemCode(row.code_ciphertext) };
}

export async function finishSnapchatOperation(operationId: string, adminTelegramUserId: string, outcome: "completed" | "cancelled") {
  const { data, error } = await getSupabaseServiceClient().rpc("finish_snapchat_operation", { p_operation_id: operationId, p_admin_telegram_user_id: adminTelegramUserId, p_outcome: outcome });
  if (error || data !== true) throw new Error("This operation is unavailable.");
}
