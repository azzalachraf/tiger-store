import { AdminShell } from "@/components/admin/AdminShell";
import { StockWorkspace } from "@/components/admin/StockWorkspace";
import { decryptRedeemCode, type SnapchatCardType } from "@/lib/snapchat-cards";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export const metadata = { title: "Card stock" };

type RedeemCardRow = {
  id: string;
  card_type: SnapchatCardType;
  code_ciphertext: string;
  status: "available" | "reserved" | "consumed" | "disabled";
  source_available: boolean;
  created_at: string;
};

export default async function CardStockPage() {
  await requireAdmin();
  const { data, error } = await getSupabaseServiceClient()
    .from("redeem_cards")
    .select(
      "id, card_type, code_ciphertext, status, source_available, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error("Card stock could not be loaded.");
  const cards = (data ?? []) as RedeemCardRow[];
  const consumedIds = cards
    .filter((card) => card.status === "consumed")
    .map((card) => card.id);
  const { data: completedOperations, error: completedOperationsError } =
    consumedIds.length
      ? await getSupabaseServiceClient()
          .from("snapchat_operations")
          .select("redeem_card_id")
          .in("redeem_card_id", consumedIds)
          .eq("status", "completed")
      : { data: [], error: null };
  if (completedOperationsError)
    throw new Error("Card history could not be loaded.");
  const completedCardIds = new Set(
    (completedOperations ?? []).map((operation) =>
      String(operation.redeem_card_id),
    ),
  );

  return (
    <AdminShell
      title="Card stock"
      description="Search inventory, upload batches and manage available cards safely."
    >
      <StockWorkspace
        cards={cards.map((card) => ({
          id: card.id,
          type: card.card_type,
          code: decryptRedeemCode(card.code_ciphertext),
          status:
            card.status === "available" && !card.source_available
              ? "disabled"
              : card.status,
          mutable: card.status === "available" && card.source_available,
          canRestore:
            card.status === "consumed" &&
            card.source_available &&
            !completedCardIds.has(card.id),
        }))}
      />
    </AdminShell>
  );
}
