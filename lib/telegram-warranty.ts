import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { getWarrantyLinkSecrets } from "@/lib/env";
import { getProductBySlug } from "@/lib/admin-store";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { CartItem, ProductPriceOption } from "@/lib/types";
import type { SnapchatCardType, SnapchatPlanMonths } from "@/lib/snapchat-cards";
import { cardCostDzd, getFinanceSettings } from "@/lib/finance";
import { getAdminCommissionDzd } from "@/lib/admin-compensation";

export type TelegramWarrantyRecord = { id: string; order_id: string; certificate_code: string; recipient_name: string; customer_username: string | null; activation_platform: string | null; customer_details_complete: boolean; form_submitted_at: string | null; balance_warning_required: boolean; balance_warning_acknowledged_at: string | null; starts_at: string; ends_at: string; covered_days: number; option_id: string };
function tokenHashes(token: string) {
  return getWarrantyLinkSecrets().map((secret) =>
    createHmac("sha256", secret).update(`telegram-warranty:${token}`).digest("hex"),
  );
}

type StoredTelegramWarranty = TelegramWarrantyRecord & { public_token_hash: string };

async function findTelegramWarranty(token: string): Promise<StoredTelegramWarranty | null> {
  const hashes = tokenHashes(token);
  const { data, error } = await getSupabaseServiceClient()
    .from("warranty_certificates")
    .select("*")
    .in("public_token_hash", hashes)
    .maybeSingle();

  if (error || !data) return null;
  return data as StoredTelegramWarranty;
}
export function createTelegramWarrantyToken() { return randomBytes(24).toString("base64url"); }
function offerForPlan(options: ProductPriceOption[] | undefined, plan: SnapchatPlanMonths) { return options?.find((option) => new RegExp(`(^|\\D)${plan}(\\D|$)`).test(`${option.label} ${option.duration}`)); }
function expiry(start: Date, months: SnapchatPlanMonths, cardType: SnapchatCardType) { const end = new Date(start); if (cardType === "inr_100" || cardType === "inr_199") end.setUTCDate(end.getUTCDate() + 7); end.setUTCMonth(end.getUTCMonth() + months); return end; }

function externalExpiry(start: Date, months: SnapchatPlanMonths) {
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + months);
  return end;
}

export async function createExternalSnapchatSale(input: { planMonths: SnapchatPlanMonths; adminTelegramUserId: string }) {
  const product = await getProductBySlug("snapchat-plus");
  if (!product) throw new Error("The Snapchat product is unavailable.");
  const settings = await getFinanceSettings();
  const configuredPlan = settings.plans[input.planMonths];
  const commissionDzd = await getAdminCommissionDzd(input.adminTelegramUserId);
  const catalogOffer = offerForPlan(product.priceOptions, input.planMonths);
  const offer = catalogOffer ?? {
    id: `snapchat-${input.planMonths}-months`,
    label: `${input.planMonths} month${input.planMonths === 1 ? "" : "s"}`,
    labelAr: `${input.planMonths} ${input.planMonths === 1 ? "شهر" : "أشهر"}`,
    duration: `${input.planMonths} month${input.planMonths === 1 ? "" : "s"}`,
    durationAr: `${input.planMonths} ${input.planMonths === 1 ? "شهر" : "أشهر"}`,
  };
  if (!Number.isInteger(configuredPlan.priceDzd) || configuredPlan.priceDzd < 1 || !Number.isInteger(commissionDzd) || commissionDzd < 0) {
    throw new Error("The finance plan is unavailable.");
  }

  const token = createTelegramWarrantyToken();
  const now = new Date();
  const endsAt = externalExpiry(now, input.planMonths);
  const orderId = `TS-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const certificateCode = `TW-${randomBytes(6).toString("hex").toUpperCase()}`;
  const item: CartItem = {
    id: `${product.id}:${offer.id}`,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    nameAr: product.nameAr,
    image: product.image,
    option: offer.label,
    optionId: offer.id,
    optionAr: offer.labelAr,
    duration: offer.duration,
    durationAr: offer.durationAr,
    price: configuredPlan.priceDzd,
    quantity: 1,
  };
  const coveredDays = Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000));
  const client = getSupabaseServiceClient();
  const rpcInput = {
    p_admin_telegram_user_id: input.adminTelegramUserId,
    p_order_id: orderId,
    p_product_item: item,
    p_plan_months: input.planMonths,
    p_total: configuredPlan.priceDzd,
    p_commission: commissionDzd,
    p_certificate_code: certificateCode,
    p_token_hash: tokenHashes(token)[0],
    p_token_hint: token.slice(-6),
    p_covered_days: coveredDays,
    p_ends_at: endsAt.toISOString(),
  };
  const { error } = await client.rpc("create_external_snapchat_sale", rpcInput);
  if (error && !["PGRST202", "42883"].includes(error.code ?? "")) {
    throw new Error("The external sale could not be created.");
  }
  if (error) {
    // Compatibility for deployments during the migration rollout. Every write
    // uses the same source-of-truth tables; cleanup prevents half-created sales.
    const fallbackCardType: Record<SnapchatPlanMonths, SnapchatCardType> = {
      1: "try_24", 2: "inr_100", 3: "try_115", 6: "try_229", 12: "inr_199",
    };
    let orderCreated = false;
    try {
      const { error: orderError } = await client.from("orders").insert({
        id: orderId,
        customerName: "Customer details incomplete",
        phone: "incomplete",
        email: "",
        products: [item],
        paymentMethod: "Telegram",
        total: configuredPlan.priceDzd,
        notes: "External Snapchat sale. Customer warranty details incomplete.",
        status: "delivered",
        createdAt: now.toISOString(),
        adminNotes: "Created as a completed external order from Telegram.",
      });
      if (orderError) throw orderError;
      orderCreated = true;
      const { error: commissionError } = await client.from("commissions").insert({
        order_id: orderId,
        recipient_telegram_user_id: input.adminTelegramUserId,
        amount_dzd: commissionDzd,
        status: "pending",
        note: "External Snapchat order credit.",
        created_by_telegram_user_id: input.adminTelegramUserId,
      });
      if (commissionError) throw commissionError;
      const { error: financeError } = await client.from("finance_sales").insert({
        order_id: orderId,
        operation_id: null,
        admin_telegram_user_id: input.adminTelegramUserId,
        plan_months: input.planMonths,
        card_type: fallbackCardType[input.planMonths],
        revenue_dzd: configuredPlan.priceDzd,
        commission_dzd: commissionDzd,
        card_cost_usd_cents: 0,
        card_cost_dzd: 0,
        gross_profit_dzd: configuredPlan.priceDzd - commissionDzd,
        completed_at: now.toISOString(),
      });
      if (financeError) throw financeError;
      const { error: certificateError } = await client.from("warranty_certificates").insert({
        operation_id: null,
        order_id: orderId,
        product_id: product.id,
        option_id: offer.id,
        certificate_code: certificateCode,
        recipient_name: "",
        covered_days: coveredDays,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "active",
        issued_by_telegram_user_id: input.adminTelegramUserId,
        public_token_hash: tokenHashes(token)[0],
        public_token_hint: token.slice(-6),
        balance_warning_required: false,
      });
      if (certificateError) throw certificateError;
      await client.from("operation_events").insert({
        actor_telegram_user_id: input.adminTelegramUserId,
        entity_type: "order",
        entity_id: orderId,
        action: "external_snapchat_sale_created",
        metadata: { plan_months: input.planMonths },
      });
    } catch {
      if (orderCreated) {
        await client.from("operation_events").delete().eq("entity_type", "order").eq("entity_id", orderId);
        await client.from("order_sheet_exports").delete().eq("order_id", orderId);
        await client.from("warranty_certificates").delete().eq("order_id", orderId);
        await client.from("finance_sales").delete().eq("order_id", orderId);
        await client.from("commissions").delete().eq("order_id", orderId);
        await client.from("orders").delete().eq("id", orderId);
      }
      throw new Error("The external sale could not be created.");
    }
  }
  return { orderId, token };
}

export async function completeSnapchatSale(input: { operationId: string; adminTelegramUserId: string }) {
  const { data: operation } = await getSupabaseServiceClient().from("snapchat_operations").select("plan_months, card_type, admin_telegram_user_id, status").eq("id", input.operationId).eq("admin_telegram_user_id", input.adminTelegramUserId).eq("status", "active").maybeSingle();
  if (!operation) throw new Error("This operation is unavailable.");
  const planMonths = Number(operation.plan_months) as SnapchatPlanMonths;
  const cardType = operation.card_type as SnapchatCardType;
  const product = await getProductBySlug("snapchat-plus");
  if (!product) throw new Error("The Snapchat product is unavailable.");
  const settings = await getFinanceSettings();
  const configuredPlan = settings.plans[planMonths];
  const commissionDzd = await getAdminCommissionDzd(input.adminTelegramUserId);
  const catalogOffer = offerForPlan(product.priceOptions, planMonths);
  const offer = catalogOffer ?? { id: `snapchat-${planMonths}-months`, label: `${planMonths} month${planMonths === 1 ? "" : "s"}`, labelAr: `${planMonths} ${planMonths === 1 ? "شهر" : "أشهر"}`, duration: `${planMonths} month${planMonths === 1 ? "" : "s"}`, durationAr: `${planMonths} ${planMonths === 1 ? "شهر" : "أشهر"}` };
  if (!Number.isInteger(configuredPlan.priceDzd) || configuredPlan.priceDzd < 1 || !Number.isInteger(commissionDzd) || commissionDzd < 0) throw new Error("The finance plan is unavailable.");
  const token = createTelegramWarrantyToken(); const now = new Date(); const endsAt = expiry(now, planMonths, cardType);
  const item: CartItem = { id: `${product.id}:${offer.id}`, productId: product.id, slug: product.slug, name: product.name, nameAr: product.nameAr, image: product.image, option: offer.label, optionId: offer.id, optionAr: offer.labelAr, duration: offer.duration, durationAr: offer.durationAr, price: configuredPlan.priceDzd, quantity: 1 };
  const orderId = `TS-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const certificateCode = `TW-${randomBytes(6).toString("hex").toUpperCase()}`;
  const { error } = await getSupabaseServiceClient().rpc("complete_snapchat_operation_sale", { p_operation_id: input.operationId, p_admin_telegram_user_id: input.adminTelegramUserId, p_order_id: orderId, p_product_item: item, p_total: configuredPlan.priceDzd, p_commission: commissionDzd, p_card_cost_usd_cents: settings.cardCostsUsdCents[cardType], p_card_cost_dzd: cardCostDzd(settings, cardType), p_certificate_code: certificateCode, p_token_hash: tokenHashes(token)[0], p_token_hint: token.slice(-6), p_covered_days: Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000)), p_ends_at: endsAt.toISOString(), p_balance_warning_required: cardType === "inr_100" || cardType === "inr_199" });
  if (error) throw new Error("The sale could not be completed.");
  return { orderId, token };
}
export async function getTelegramWarranty(token: string): Promise<TelegramWarrantyRecord | null> {
  return findTelegramWarranty(token);
}

export async function getCompletedTelegramWarrantyOrderIds(orderIds: string[]): Promise<Set<string>> {
  return new Set((await getCompletedTelegramWarrantyDetails(orderIds)).keys());
}

export type CompletedTelegramWarrantyDetails = {
  username: string;
  activationPlatform: string;
};

export async function getCompletedTelegramWarrantyDetails(orderIds: string[]): Promise<Map<string, CompletedTelegramWarrantyDetails>> {
  const uniqueOrderIds = [...new Set(orderIds.filter(Boolean))];
  if (!uniqueOrderIds.length) return new Map();

  const { data, error } = await getSupabaseServiceClient()
    .from("warranty_certificates")
    .select("order_id, customer_username, activation_platform, form_submitted_at")
    .in("order_id", uniqueOrderIds)
    .eq("customer_details_complete", true)
    .not("form_submitted_at", "is", null);
  if (error) throw new Error("Warranty completion state could not be loaded.");
  const details = new Map<string, CompletedTelegramWarrantyDetails>();
  for (const row of data ?? []) {
    const username = typeof row.customer_username === "string" ? row.customer_username.trim() : "";
    const activationPlatform = typeof row.activation_platform === "string" ? row.activation_platform.trim() : "";
    if (username && activationPlatform) {
      details.set(String(row.order_id), { username, activationPlatform });
    }
  }
  return details;
}

export async function submitTelegramWarranty(token: string, input: { name: string; username: string; platform: string; phone: string; email: string; paymentMethod: "BaridiMob" | "Binance" | "RedotPay" | "Flexy" }) {
  const warranty = await findTelegramWarranty(token);
  if (!warranty) throw new Error("Warranty form is unavailable.");
  const client = getSupabaseServiceClient();
  const { error: paymentError } = await client.from("orders").update({ paymentMethod: input.paymentMethod }).eq("id", warranty.order_id);
  if (paymentError) throw new Error("Warranty payment method could not be saved.");
  const { error } = await client.rpc("submit_snapchat_warranty_form", { p_token_hash: warranty.public_token_hash, p_name: input.name, p_username: input.username, p_platform: input.platform, p_phone: input.phone, p_email: input.email });
  if (error) throw new Error("Warranty form is unavailable.");
}

export async function acknowledgeTelegramWarrantyBalance(token: string) {
  const warranty = await findTelegramWarranty(token);
  if (!warranty) throw new Error("Warning acknowledgement failed.");
  const { error } = await getSupabaseServiceClient().rpc("acknowledge_snapchat_balance_warning", { p_token_hash: warranty.public_token_hash });
  if (error) throw new Error("Warning acknowledgement failed.");
}
