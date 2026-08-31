import "server-only";

import { getOrders } from "@/lib/admin-store";
import { getFinanceReports } from "@/lib/finance";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { getCompletedTelegramWarrantyOrderIds } from "@/lib/telegram-warranty";
import type { TigerNewSheetRow } from "@/lib/tiger-new-sheet-types";
export { tigerNewSheetHeaders, type TigerNewSheetRow } from "@/lib/tiger-new-sheet-types";

// Flexy is only offered for Snapchat Plus. The copied Amount Paid is the
// customer-facing Flexy price less the agreed 15% provider deduction.
const flexyGrossByMonths: Record<number, number> = { 1: 750, 2: 1000, 3: 1900, 6: 2400, 12: 2800 };

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
  const grossAmount = flexyGrossByMonths[monthsFromDuration(duration) ?? 0];
  return grossAmount ? Math.floor(grossAmount * 85 / 100) : total;
}

function sheetPaymentMethod(paymentMethod: string) {
  // Telegram identifies where an operation originated; it is never a customer
  // payment method. Leave old incomplete records blank until an admin records
  // the actual method in the order panel.
  if (paymentMethod === "Telegram") return "Not recorded";
  return paymentMethod === "Flexy" ? "Flexy (15% deducted)" : paymentMethod;
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
  // Tiger New Sheet is for finished, customer-complete warranty orders only.
  // This prevents placeholder Telegram orders from being copied into the
  // owner's operational sheet before the customer has submitted the form.
  const completedWarrantyOrderIds = await getCompletedTelegramWarrantyOrderIds([...exportIds]);
  const salesByOrder = new Map(finance.sales.map((sale) => [String(sale.order_id), sale]));
  const adminsById = new Map(finance.admins.map((admin) => [String(admin.telegram_user_id), admin]));

  return orders.filter((order) => exportIds.has(order.id) && completedWarrantyOrderIds.has(order.id)).map((order) => {
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
      paymentMethod: sheetPaymentMethod(order.paymentMethod),
      admin: displayAdmin(sale ? adminsById.get(String(sale.admin_telegram_user_id)) : undefined),
    };
  });
}

export async function markTigerNewSheetRowsCopied(orderIds: string[]) {
  if (!orderIds.length) return [];
  // Do not trust an order ID supplied by the browser. A row can be marked as
  // copied only after its warranty form has been completed server-side.
  const completedWarrantyOrderIds = await getCompletedTelegramWarrantyOrderIds(orderIds);
  const eligibleOrderIds = orderIds.filter((orderId) => completedWarrantyOrderIds.has(orderId));
  if (!eligibleOrderIds.length) return [];
  const { data, error } = await getSupabaseServiceClient()
    .from("order_sheet_exports")
    .update({ copied_at: new Date().toISOString() })
    .in("order_id", eligibleOrderIds)
    .is("copied_at", null)
    .select("order_id");
  if (error) throw new Error("Tiger New Sheet copy state could not be saved.");
  return (data ?? []).map((row) => String(row.order_id));
}
