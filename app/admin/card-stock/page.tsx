import { CircleCheck, CircleDashed, CircleX, LockKeyhole, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { addRedeemCardsAction, markRedeemCardUsedAction, removeRedeemCardAction } from "@/app/admin/card-stock/actions";
import { cardLabel, snapchatCardTypes, type SnapchatCardType } from "@/lib/snapchat-cards";
import { getSupabaseServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Card stock" };

type RedeemCardRow = {
  id: string;
  card_type: SnapchatCardType;
  status: "available" | "reserved" | "consumed" | "disabled";
  source_available: boolean;
  created_at: string;
};

const stateDetails = {
  available: { label: "Available", icon: CircleCheck, className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  reserved: { label: "Reserved", icon: CircleDashed, className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  consumed: { label: "Used", icon: CircleX, className: "border-rose-400/30 bg-rose-400/10 text-rose-200" },
  disabled: { label: "Disabled", icon: CircleX, className: "border-white/15 bg-white/5 text-white/55" },
} as const;

function cardRef(id: string) {
  return `Card ${id.slice(0, 8).toUpperCase()}`;
}

export default async function CardStockPage() {
  const { data, error } = await getSupabaseServiceClient()
    .from("redeem_cards")
    .select("id, card_type, status, source_available, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Card stock could not be loaded.");
  const cards = (data ?? []) as RedeemCardRow[];

  return <AdminShell title="Card stock" description="Paste cards manually by type. Each entry is encrypted, then shared only with the assigned operator through Telegram.">
    <section className="grid gap-4 xl:grid-cols-2">
      {snapchatCardTypes.map((cardType) => {
        const entries = cards.filter((card) => card.card_type === cardType);
        const counts = {
          available: entries.filter((card) => card.status === "available" && card.source_available).length,
          reserved: entries.filter((card) => card.status === "reserved").length,
          consumed: entries.filter((card) => card.status === "consumed").length,
        };
        return <article key={cardType} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_16px_42px_rgba(0,0,0,0.16)]">
          <div className="border-b border-white/10 bg-black/20 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-black text-white">{cardLabel(cardType, "en")}</h2><p className="mt-1 text-xs font-semibold text-white/48">Snapchat redeem cards</p></div>
              <div className="flex flex-wrap gap-2 text-xs font-black">
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-300">{counts.available} available</span>
                <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-amber-200">{counts.reserved} reserved</span>
                <span className="rounded-full bg-rose-400/10 px-2.5 py-1 text-rose-200">{counts.consumed} used</span>
              </div>
            </div>
          </div>

          <form action={addRedeemCardsAction} className="border-b border-white/10 p-4 sm:p-5">
            <input type="hidden" name="cardType" value={cardType} />
            <label htmlFor={`codes-${cardType}`} className="block text-sm font-black text-white">Add cards</label>
            <p className="mt-1 text-xs leading-5 text-white/55">Paste 1–100 codes or Apple redemption links, one per line.</p>
            <textarea id={`codes-${cardType}`} name="codes" required rows={4} maxLength={52000} placeholder="https://apps.apple.com/redeem/?code=…" className="mt-3 block w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 font-mono text-xs text-white outline-none placeholder:text-white/30 focus:border-tiger-ember" />
            <button type="submit" className="mt-3 min-h-11 rounded-xl bg-tiger-ember px-4 text-sm font-black text-black hover:bg-[#ff842d]">Add to stock</button>
          </form>

          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-white/55"><LockKeyhole className="h-3.5 w-3.5 text-tiger-gold" /> Codes stay hidden here for safe assignment.</div>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {entries.map((card) => {
                const state = stateDetails[card.status];
                const StateIcon = state.icon;
                const mutable = card.status === "available" && card.source_available;
                return <div key={card.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                  <span className="font-mono text-xs font-bold text-white/70">{cardRef(card.id)}</span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-black ${state.className}`}><StateIcon className="h-3.5 w-3.5" />{state.label}</span>
                    {mutable ? <form action={markRedeemCardUsedAction}><input type="hidden" name="cardId" value={card.id} /><button type="submit" className="min-h-9 rounded-lg border border-rose-400/35 px-2 text-[11px] font-black text-rose-200 hover:bg-rose-400/10">Mark used</button></form> : null}
                    {mutable ? <form action={removeRedeemCardAction}><input type="hidden" name="cardId" value={card.id} /><button type="submit" aria-label={`Remove ${cardRef(card.id)}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/55 hover:border-rose-400/35 hover:text-rose-200"><Trash2 className="h-4 w-4" /></button></form> : null}
                  </div>
                </div>;
              })}
              {!entries.length ? <p className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-sm font-semibold text-white/45">No cards in this type yet.</p> : null}
            </div>
          </div>
        </article>;
      })}
    </section>
  </AdminShell>;
}
