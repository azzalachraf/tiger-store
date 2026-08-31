import "server-only";

import { getOrders } from "@/lib/admin-store";
import { getFinanceReports } from "@/lib/finance";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { TigerNewSheetRow } from "@/lib/tiger-new-sheet-types";
export { tigerNewSheetHeaders, type TigerNewSheetRow } from "@/lib/tiger-new-sheet-types";

const flexyPaidByMonths: Record<number, number> = { 1: 635, 2: 850, 3: 1615, 6: 2040, 12: 2380 };

function monthsFromDuration(value: string) {
  const match = value.match(/(?:^|\D)(12|6|3|2|1)(?:\D|$)/);
  return match ? Number(match[1]) : undefined;
}

function displayAdmin(admin: { first_name: string | null; username: string | null } | undefined) {
  if (!admin) return "Website";
  if (admin.username?.trim()) return `@${admin.username.trim()}`;
  return admin.first_name?.trim() || "Admin";
}

function flexyAmountPaid(paymentMethod: string, subscription: string, duration: string, total: number) {
  if (paymentMethod !== "Flexy" || !/snapchat/i.test(subscription)) return total;
  const value = flexyPaidByMonths[monthsFromDuration(duration) ?? 0];
  return value ?? total;
}

export async function getTigerNewSheetRows(): Promise<TigerNewSheetRow[]> {
  const client = getSupabaseServiceClient();
  const [{ data: exports, error: exportsError }, orders, finance] = await Promise.all([
    client.from("order_sheet_exports").select("order_id, warranty_issued_at").is("copied_at", null).order("warranty_issued_at", { ascending: true }),
    getOrders(),
    getFinanceReports(),
  ]);
  if (exportsError) throw new Error("Tiger New Sheet could not be loaded.");

  const exportIds = new Set((exports ?? []).map((entry) => String(entry.order_id)));
  const salesByOrder = new Map(finance.sales.map((sale) => [String(sale.order_id), sale]));
  const adminsById = new Map(finance.admins.map((admin) => [String(admin.telegram_user_id), admin]));

  return orders.filter((order) => exportIds.has(order.id)).map((order) => {
    const subscription = order.products.length ? order.products.map((item) => item.name).join(" + ") : "Manual order";
    const duration = order.products.length ? order.products.map((item) => item.option || item.duration).join(" + ") : "";
    const sale = salesByOrder.get(order.id);
    const amountPaid = flexyAmountPaid(order.paymentMethod, subscription, duration, order.total);
    const costPrice = sale ? Number(sale.card_cost_dzd) : 0;
    const netProfit = amountPaid - costPrice - 100;
    return {
      orderId: order.id,
      client: order.customerName || "Customer",
      subscription,
      duration,
      costPrice: sale ? String(costPrice) : "",
      amountPaid: String(amountPaid),
      spend: "",
      cost: "",
      netProfit: String(netProfit),
      paymentMethod: order.paymentMethod,
      admin: displayAdmin(sale ? adminsById.get(String(sale.admin_telegram_user_id)) : undefined),
    };
  });
}

export async function markTigerNewSheetRowsCopied(orderIds: string[]) {
  if (!orderIds.length) return [];
  const { data, error } = await getSupabaseServiceClient()
    .from("order_sheet_exports")
    .update({ copied_at: new Date().toISOString() })
    .in("order_id", orderIds)
    .is("copied_at", null)
    .select("order_id");
  if (error) throw new Error("Tiger New Sheet copy state could not be saved.");
  return (data ?? []).map((row) => String(row.order_id));
}
