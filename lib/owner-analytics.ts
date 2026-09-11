import { getFinanceSettings } from "@/lib/finance";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { readAll } from "@/lib/read-all";
import { buildOwnerAnalytics, type AnalyticsRange, type AnalyticsSale, type AnalyticsSpend } from "@/lib/owner-analytics-core";

export { buildOwnerAnalytics, rangeFor, type AnalyticsRange } from "@/lib/owner-analytics-core";

export async function getOwnerAnalytics(range: AnalyticsRange) {
  const client = getSupabaseServiceClient();
  const [{ data: sales, error: salesError }, { data: deliveredOrders, error: ordersError }, { data: admins, error: adminsError }, { data: spends, error: spendsError }, { count: inventoryAvailable, error: inventoryError }, settings] = await Promise.all([
    readAll(client.from("finance_sales").select("order_id, admin_telegram_user_id, plan_months, revenue_dzd, commission_dzd, card_cost_dzd, completed_at").order("order_id")),
    readAll(client.from("orders").select("id, total, createdAt").eq("status", "delivered").order("id")),
    readAll(client.from("telegram_users").select("telegram_user_id, username, first_name").order("telegram_user_id")),
    readAll(client.from("advertising_spend").select("id, spend_date, amount_dzd, amount_usd_cents, source_id").order("id")),
    client.from("redeem_cards").select("id", { count: "exact", head: true }).eq("status", "available"),
    getFinanceSettings(),
  ]);
  if (salesError || ordersError || adminsError || spendsError || inventoryError) throw new Error("Owner analytics could not be loaded.");
  const telegramSales = (sales ?? []).map((sale) => ({ ...sale, source: "telegram" as const }));
  const telegramOrderIds = new Set(telegramSales.map((sale) => String(sale.order_id)));
  const websiteSales: AnalyticsSale[] = (deliveredOrders ?? [])
    .filter((order) => !telegramOrderIds.has(String(order.id)))
    .filter((order) => !Number.isNaN(new Date(String(order.createdAt)).getTime()))
    .map((order) => ({
      order_id: String(order.id),
      admin_telegram_user_id: "website",
      plan_months: 0,
      revenue_dzd: Number(order.total),
      commission_dzd: 0,
      card_cost_dzd: 0,
      completed_at: String(order.createdAt),
      source: "website",
    }));
  const adminLabels = Object.fromEntries((admins ?? []).map((admin) => {
    const id = String(admin.telegram_user_id);
    const label = admin.username ? `@${admin.username}` : admin.first_name?.trim() || `Admin ${id}`;
    return [id, label];
  }));
  return buildOwnerAnalytics(range, [...telegramSales, ...websiteSales], (spends ?? []) as AnalyticsSpend[], settings.usdDzdRate, inventoryAvailable ?? 0, adminLabels);
}

export function formatOwnerAnalytics(locale: "ar" | "en", report: ReturnType<typeof buildOwnerAnalytics>) {
  const admins = Object.entries(report.adminCounts).map(([admin, count]) => `👤 ${report.adminLabels[admin] ?? `Admin ${admin}`}: ${count}`).join("\n") || "👤 —";
  const label = locale === "ar" ? ({ today: "اليوم", yesterday: "أمس", "7d": "آخر 7 أيام", "30d": "آخر 30 يومًا", month: "هذا الشهر", custom: "فترة مخصصة" }[report.range.label] ?? report.range.label) : ({ today: "Today", yesterday: "Yesterday", "7d": "Last 7 days", "30d": "Last 30 days", month: "This month", custom: "Custom range" }[report.range.label] ?? report.range.label);
  return locale === "ar" ? `📈 صافي الربح — ${label}\n📦 الطلبات المكتملة: ${report.totalOrders}\n💰 الإيراد: ${report.revenueDzd} DA\n✅ صافي الربح: ${report.netProfitDzd} DA\n👥 الطلبات حسب المشرف:\n${admins}` : `📈 Net profit — ${label}\n📦 Completed orders: ${report.totalOrders}\n💰 Revenue: ${report.revenueDzd} DA\n✅ Net profit: ${report.netProfitDzd} DA\n👥 Orders by admin:\n${admins}`;
}
