import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { getWarrantyLinkSecret } from "@/lib/env";
import { getProductBySlug } from "@/lib/admin-store";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { CartItem, ProductPriceOption } from "@/lib/types";
import type { SnapchatCardType, SnapchatPlanMonths } from "@/lib/snapchat-cards";
import { cardCostDzd, getFinanceSettings } from "@/lib/finance";

export type TelegramWarrantyRecord = { id: string; order_id: string; certificate_code: string; recipient_name: string; customer_username: string | null; activation_platform: string | null; customer_details_complete: boolean; form_submitted_at: string | null; balance_warning_required: boolean; balance_warning_acknowledged_at: string | null; starts_at: string; ends_at: string; covered_days: number; option_id: string };
function hashToken(token: string) { return createHmac("sha256", getWarrantyLinkSecret()).update(`telegram-warranty:${token}`).digest("hex"); }
export function createTelegramWarrantyToken() { return randomBytes(24).toString("base64url"); }
function offerForPlan(options: ProductPriceOption[] | undefined, plan: SnapchatPlanMonths) { return options?.find((option) => new RegExp(`(^|\\D)${plan}(\\D|$)`).test(`${option.label} ${option.duration}`)); }
function expiry(start: Date, months: SnapchatPlanMonths, cardType: SnapchatCardType) { const end = new Date(start); if (cardType === "inr_100" || cardType === "inr_199") end.setUTCDate(end.getUTCDate() + 7); end.setUTCMonth(end.getUTCMonth() + months); return end; }

export async function completeSnapchatSale(input: { operationId: string; adminTelegramUserId: string }) {
  const { data: operation } = await getSupabaseServiceClient().from("snapchat_operations").select("plan_months, card_type, admin_telegram_user_id, status").eq("id", input.operationId).eq("admin_telegram_user_id", input.adminTelegramUserId).eq("status", "active").maybeSingle();
  if (!operation) throw new Error("This operation is unavailable.");
  const planMonths = Number(operation.plan_months) as SnapchatPlanMonths;
  const cardType = operation.card_type as SnapchatCardType;
  const product = await getProductBySlug("snapchat-plus");
  if (!product) throw new Error("The Snapchat product is unavailable.");
  const settings = await getFinanceSettings();
  const configuredPlan = settings.plans[planMonths];
  const catalogOffer = offerForPlan(product.priceOptions, planMonths);
  const offer = catalogOffer ?? { id: `snapchat-${planMonths}-months`, label: `${planMonths} month${planMonths === 1 ? "" : "s"}`, labelAr: `${planMonths} ${planMonths === 1 ? "شهر" : "أشهر"}`, duration: `${planMonths} month${planMonths === 1 ? "" : "s"}`, durationAr: `${planMonths} ${planMonths === 1 ? "شهر" : "أشهر"}` };
  if (!Number.isInteger(configuredPlan.priceDzd) || configuredPlan.priceDzd < 1 || !Number.isInteger(configuredPlan.commissionDzd) || configuredPlan.commissionDzd < 0) throw new Error("The finance plan is unavailable.");
  const token = createTelegramWarrantyToken(); const now = new Date(); const endsAt = expiry(now, planMonths, cardType);
  const item: CartItem = { id: `${product.id}:${offer.id}`, productId: product.id, slug: product.slug, name: product.name, nameAr: product.nameAr, image: product.image, option: offer.label, optionId: offer.id, optionAr: offer.labelAr, duration: offer.duration, durationAr: offer.durationAr, price: configuredPlan.priceDzd, quantity: 1 };
  const orderId = `TS-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const certificateCode = `TW-${randomBytes(6).toString("hex").toUpperCase()}`;
  const { error } = await getSupabaseServiceClient().rpc("complete_snapchat_operation_sale", { p_operation_id: input.operationId, p_admin_telegram_user_id: input.adminTelegramUserId, p_order_id: orderId, p_product_item: item, p_total: configuredPlan.priceDzd, p_commission: configuredPlan.commissionDzd, p_card_cost_usd_cents: settings.cardCostsUsdCents[cardType], p_card_cost_dzd: cardCostDzd(settings, cardType), p_certificate_code: certificateCode, p_token_hash: hashToken(token), p_token_hint: token.slice(-6), p_covered_days: Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000)), p_ends_at: endsAt.toISOString(), p_balance_warning_required: cardType === "inr_100" || cardType === "inr_199" });
  if (error) throw new Error("The sale could not be completed.");
  return { orderId, token };
}
export async function getTelegramWarranty(token: string) { const { data } = await getSupabaseServiceClient().from("warranty_certificates").select("*").eq("public_token_hash", hashToken(token)).maybeSingle(); return data as TelegramWarrantyRecord | null; }
export async function submitTelegramWarranty(token: string, input: { name: string; username: string; platform: string; phone: string; email: string }) { const { error } = await getSupabaseServiceClient().rpc("submit_snapchat_warranty_form", { p_token_hash: hashToken(token), p_name: input.name, p_username: input.username, p_platform: input.platform, p_phone: input.phone, p_email: input.email }); if (error) throw new Error("Warranty form is unavailable."); }
export async function acknowledgeTelegramWarrantyBalance(token: string) { const { error } = await getSupabaseServiceClient().rpc("acknowledge_snapchat_balance_warning", { p_token_hash: hashToken(token) }); if (error) throw new Error("Warning acknowledgement failed."); }
