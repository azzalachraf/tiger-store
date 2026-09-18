import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";
import { snapchatCardTypes, type SnapchatCardType, type SnapchatPlanMonths } from "@/lib/snapchat-cards";
import { getOrders } from "@/lib/admin-store";
import { adminOrderSchema } from "@/lib/validation";
import { calculateAdminCycleStatistics, type AdminCycleStatistics } from "@/lib/admin-cycle-statistics";
import { rangeFor } from "@/lib/owner-analytics-core";

export { calculateAdminCycleStatistics, type AdminCycleStatistics } from "@/lib/admin-cycle-statistics";

export type PlanFinance = { priceDzd: number; commissionDzd: number };
export type FinanceSettings = { usdDzdRate: number; plans: Record<SnapchatPlanMonths, PlanFinance>; cardCostsUsdCents: Record<SnapchatCardType, number>; paymentDay: number; reportingSheetId: string };

export const financeDefaults: FinanceSettings = {
  usdDzdRate: 250,
  plans: { 1: { priceDzd: 600, commissionDzd: 100 }, 2: { priceDzd: 800, commissionDzd: 100 }, 3: { priceDzd: 1600, commissionDzd: 100 }, 6: { priceDzd: 2000, commissionDzd: 100 }, 12: { priceDzd: 2300, commissionDzd: 100 } },
  cardCostsUsdCents: { try_24: 54, try_48: 108, inr_100: 115, try_115: 260, inr_199: 215, try_229: 500, inr_298: 335 },
  paymentDay: 1,
  reportingSheetId: "",
};

type SettingsRow = { usd_dzd_rate: number; snapchat_plans: unknown; card_costs_usd_cents: unknown; payment_day: number; reporting_sheet_id: string };
function integer(value: unknown, fallback: number) { return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback; }
function settingsFromRow(row: SettingsRow | null): FinanceSettings {
  if (!row) return financeDefaults;
  const plans = row.snapchat_plans && typeof row.snapchat_plans === "object" ? row.snapchat_plans as Record<string, unknown> : {};
  const costs = row.card_costs_usd_cents && typeof row.card_costs_usd_cents === "object" ? row.card_costs_usd_cents as Record<string, unknown> : {};
  const resolvedPlans = { ...financeDefaults.plans };
  for (const month of [1, 2, 3, 6, 12] as SnapchatPlanMonths[]) {
    const current = plans[String(month)];
    if (current && typeof current === "object") {
      const item = current as Record<string, unknown>;
      resolvedPlans[month] = { priceDzd: integer(item.price_dzd, financeDefaults.plans[month].priceDzd), commissionDzd: integer(item.commission_dzd, financeDefaults.plans[month].commissionDzd) };
    }
  }
  const resolvedCosts = { ...financeDefaults.cardCostsUsdCents };
  for (const card of snapchatCardTypes) resolvedCosts[card] = integer(costs[card], financeDefaults.cardCostsUsdCents[card]);
  return { usdDzdRate: integer(row.usd_dzd_rate, financeDefaults.usdDzdRate), plans: resolvedPlans, cardCostsUsdCents: resolvedCosts, paymentDay: Math.min(28, Math.max(1, integer(row.payment_day, financeDefaults.paymentDay))), reportingSheetId: row.reporting_sheet_id ?? "" };
}

export async function getFinanceSettings() {
  const { data, error } = await getSupabaseServiceClient().from("finance_settings").select("usd_dzd_rate, snapchat_plans, card_costs_usd_cents, payment_day, reporting_sheet_id").eq("id", "main").maybeSingle();
  if (error) throw new Error("Finance settings could not be read.");
  return settingsFromRow(data as SettingsRow | null);
}

export async function saveFinanceSettings(settings: FinanceSettings) {
  // Snapchat sales use one fixed 100 DA credit per completed order. Owner
  // adjustments remain separate so historic sales never receive an accidental
  // variable commission value from a form submission.
  const plans = Object.fromEntries((Object.entries(settings.plans) as [string, PlanFinance][]).map(([month, plan]) => [month, { price_dzd: plan.priceDzd, commission_dzd: 100 }]));
  const { error } = await getSupabaseServiceClient().from("finance_settings").upsert({ id: "main", usd_dzd_rate: settings.usdDzdRate, snapchat_plans: plans, card_costs_usd_cents: settings.cardCostsUsdCents, payment_day: settings.paymentDay, reporting_sheet_id: settings.reportingSheetId });
  if (error) throw new Error("Finance settings could not be saved.");
}

export function cardCostDzd(settings: FinanceSettings, cardType: SnapchatCardType) { return Math.floor(settings.cardCostsUsdCents[cardType] * settings.usdDzdRate / 100); }

export type AdminFinanceSummary = { adminId: string; completedOrders: number; commissionDzd: number; paidDzd: number; adjustmentsDzd: number; remainingDzd: number; nextPaymentDate: string };
/** Sales and earned credit since the last full settlement, for the admin bot. */
export type AdminStatisticsPeriod = "today" | "yesterday" | "30d" | "all";

export async function getAdminCycleStatistics(
  adminId: string,
  period: AdminStatisticsPeriod = "all",
): Promise<AdminCycleStatistics> {
  const client = getSupabaseServiceClient();
  const [{ data: sales, error: salesError }, { data: settlements, error: settlementsError }] = await Promise.all([
    client.from("finance_sales").select("commission_dzd, completed_at").eq("admin_telegram_user_id", adminId),
    client.from("admin_payments").select("paid_at").eq("admin_telegram_user_id", adminId).eq("settles_cycle", true).order("paid_at", { ascending: false }).limit(1),
  ]);
  if (salesError || settlementsError) throw new Error("Admin cycle statistics could not be read.");
  const range = period === "all" ? null : rangeFor(period);
  return calculateAdminCycleStatistics(sales ?? [], settlements?.[0]?.paid_at ?? null, range);
}
export async function getAdminFinanceSummary(adminId: string): Promise<AdminFinanceSummary> {
  const client = getSupabaseServiceClient();
  const [{ data: user, error: userError }, { data: sales, error: salesError }, { data: payments, error: paymentsError }, { data: adjustments, error: adjustmentsError }, settings] = await Promise.all([
    client.from("telegram_users").select("work_started_at, next_payment_date").eq("telegram_user_id", adminId).maybeSingle(),
    client.from("finance_sales").select("commission_dzd").eq("admin_telegram_user_id", adminId),
    client.from("admin_payments").select("amount_dzd").eq("admin_telegram_user_id", adminId),
    client.from("financial_adjustments").select("amount_dzd").eq("recipient_telegram_user_id", adminId),
    getFinanceSettings(),
  ]);
  if (userError || salesError || paymentsError || adjustmentsError) throw new Error("Admin finance summary could not be read.");
  const commissionDzd = (sales ?? []).reduce((sum, row) => sum + Number(row.commission_dzd), 0);
  const paidDzd = (payments ?? []).reduce((sum, row) => sum + Number(row.amount_dzd), 0);
  const adjustmentsDzd = (adjustments ?? []).reduce((sum, row) => sum + Number(row.amount_dzd), 0);
  const workStart = user?.work_started_at ? new Date(`${user.work_started_at}T00:00:00Z`) : new Date();
  const next = user?.next_payment_date
    ? new Date(`${user.next_payment_date}T00:00:00Z`)
    : calculateNextPaymentDate(workStart, settings.paymentDay);
  return { adminId, completedOrders: sales?.length ?? 0, commissionDzd, paidDzd, adjustmentsDzd, remainingDzd: commissionDzd + adjustmentsDzd - paidDzd, nextPaymentDate: next.toISOString().slice(0, 10) };
}

export type AdminClientSheetRow = {
  orderId: string;
  completedAt: string;
  planMonths: number;
  productName: string;
  customerName: string;
  phone: string;
  email: string;
  status: string;
  revenueDzd: number;
  commissionDzd: number;
};

/**
 * A private, server-side view of one Telegram administrator's completed sales.
 * Finance sales are the source for ownership; order details are only joined for
 * the authenticated website administrator who is viewing this internal sheet.
 */
export async function getAdminClientSheet(adminId: string): Promise<AdminClientSheetRow[]> {
  const client = getSupabaseServiceClient();
  const { data: sales, error } = await client
    .from("finance_sales")
    .select("order_id, plan_months, revenue_dzd, commission_dzd, completed_at")
    .eq("admin_telegram_user_id", adminId)
    .order("completed_at", { ascending: false });
  if (error) throw new Error("Admin client sheet could not be loaded.");

  const orderIds = (sales ?? []).map((sale) => String(sale.order_id));
  const { data: orderData, error: ordersError } = orderIds.length
    ? await client.from("orders").select("*").in("id", orderIds)
    : { data: [], error: null };
  if (ordersError) throw new Error("Admin client orders could not be loaded.");
  const orders = adminOrderSchema.array().catch([]).parse(orderData ?? []);
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  return (sales ?? []).map((sale) => {
    const orderId = String(sale.order_id);
    const order = ordersById.get(orderId);
    const item = order?.products[0];
    return {
      orderId,
      completedAt: String(sale.completed_at),
      planMonths: Number(sale.plan_months),
      productName: item?.name ?? "Snapchat Plus",
      customerName: order?.customerName ?? "Customer details incomplete",
      phone: order?.phone ?? "—",
      email: order?.email ?? "—",
      status: order?.status ?? "delivered",
      revenueDzd: Number(sale.revenue_dzd),
      commissionDzd: Number(sale.commission_dzd),
    };
  });
}

export async function getFinanceReports() {
  const client = getSupabaseServiceClient();
  const [{ data: sales, error: salesError }, { data: admins, error: adminsError }, { data: cards, error: cardsError }, { data: advertising, error: advertisingError }, settings] = await Promise.all([
    client.from("finance_sales").select("order_id, admin_telegram_user_id, plan_months, card_type, revenue_dzd, commission_dzd, card_cost_usd_cents, card_cost_dzd, gross_profit_dzd, completed_at").order("completed_at", { ascending: true }),
    client.from("telegram_users").select("telegram_user_id, first_name, username, role, work_started_at, next_payment_date").in("role", ["owner", "admin"]),
    client.from("redeem_cards").select("card_type, status"),
    client.from("advertising_spend").select("spend_date, platform, campaign, amount_dzd, amount_usd_cents, note").order("spend_date", { ascending: false }),
    getFinanceSettings(),
  ]);
  if (salesError || adminsError || cardsError || advertisingError) throw new Error("Finance reports could not be read.");
  return { settings, sales: sales ?? [], admins: admins ?? [], cards: cards ?? [], advertisingSpend: advertising ?? [] };
}

export async function reconcileFinanceReports() {
  const [reports, orders] = await Promise.all([getFinanceReports(), getOrders()]);
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const mismatches = reports.sales.filter((sale) => ordersById.get(String(sale.order_id))?.total !== Number(sale.revenue_dzd));
  return {
    completedSales: reports.sales.length,
    revenueDzd: reports.sales.reduce((sum, sale) => sum + Number(sale.revenue_dzd), 0),
    mismatchCount: mismatches.length,
  };
}

export function calculateNextPaymentDate(workStart: Date, paymentDay: number, now = new Date()) {
  const next = new Date(Date.UTC(workStart.getUTCFullYear(), workStart.getUTCMonth(), Math.min(paymentDay, 28)));
  while (next.getTime() < now.getTime()) next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}
