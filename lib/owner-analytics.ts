import { getFinanceSettings } from "@/lib/finance";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { buildOwnerAnalytics, type AnalyticsRange, type AnalyticsSale, type AnalyticsSpend } from "@/lib/owner-analytics-core";

export { buildOwnerAnalytics, rangeFor, type AnalyticsRange } from "@/lib/owner-analytics-core";

export async function getOwnerAnalytics(range: AnalyticsRange) {
  const client = getSupabaseServiceClient();
  const [{ data: sales, error: salesError }, { data: spends, error: spendsError }, { count: inventoryAvailable, error: inventoryError }, settings] = await Promise.all([
    client.from("finance_sales").select("order_id, admin_telegram_user_id, plan_months, revenue_dzd, commission_dzd, card_cost_dzd, completed_at"),
    client.from("advertising_spend").select("id, spend_date, amount_usd_cents, source_id"),
    client.from("redeem_cards").select("id", { count: "exact", head: true }).eq("status", "available"),
    getFinanceSettings(),
  ]);
  if (salesError || spendsError || inventoryError) throw new Error("Owner analytics could not be loaded.");
  return buildOwnerAnalytics(range, (sales ?? []) as AnalyticsSale[], (spends ?? []) as AnalyticsSpend[], settings.usdDzdRate, inventoryAvailable ?? 0);
}

export function formatOwnerAnalytics(locale: "ar" | "en", report: ReturnType<typeof buildOwnerAnalytics>) {
  const missing = report.missingAdvertisingDates.length ? (locale === "ar" ? `\nتنبيه: لا يوجد إنفاق إعلاني مسجل لهذه الأيام: ${report.missingAdvertisingDates.join(", ")}` : `\nWarning: advertising spend is missing for: ${report.missingAdvertisingDates.join(", ")}`) : "";
  const admins = Object.entries(report.adminCounts).map(([admin, count]) => `${admin}=${count}`).join(locale === "ar" ? "، " : ", ") || "—";
  return locale === "ar" ? `صافي الربح (${report.range.start} → ${report.range.end})\nالطلبات: ${report.totalOrders}\nالإيراد: ${report.revenueDzd} DZD\nتكلفة البطاقات: ${report.cardCostsDzd} DZD\nالعمولات: ${report.commissionsDzd} DZD\nالإعلانات: ${report.advertisingDzd} DZD\nتكلفة الطلب: ${report.costPerOrderDzd ?? "—"} DZD\nالهامش: ${report.marginDzd ?? "—"}%\nصافي الربح: ${report.netProfitDzd} DZD\nالمخزون المتاح: ${report.inventoryAvailable}\nالخطط: ${Object.entries(report.planCounts).map(([plan, count]) => `${plan}ش=${count}`).join("، ")}\nحسب المسؤول: ${admins}${missing}` : `Net profit (${report.range.start} → ${report.range.end})\nOrders: ${report.totalOrders}\nRevenue: ${report.revenueDzd} DZD\nCard costs: ${report.cardCostsDzd} DZD\nCommissions: ${report.commissionsDzd} DZD\nAdvertising: ${report.advertisingDzd} DZD\nCost per order: ${report.costPerOrderDzd ?? "—"} DZD\nMargin: ${report.marginDzd ?? "—"}%\nNet profit: ${report.netProfitDzd} DZD\nAvailable inventory: ${report.inventoryAvailable}\nPlans: ${Object.entries(report.planCounts).map(([plan, count]) => `${plan}m=${count}`).join(", ")}\nBy admin: ${admins}${missing}`;
}
