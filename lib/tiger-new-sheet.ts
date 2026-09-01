import "server-only";

import { getOrders } from "@/lib/admin-store";
import { getFinanceReports } from "@/lib/finance";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { TigerNewSheetData, TigerNewSheetRow, TigerNewSheetScope } from "@/lib/tiger-new-sheet-types";
export { tigerNewSheetHeaders, type TigerNewSheetData, type TigerNewSheetRow, type TigerNewSheetScope } from "@/lib/tiger-new-sheet-types";

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
  if (paymentMethod === "Telegram" || !paymentMethod.trim()) return "Not submitted";
  return paymentMethod === "Flexy" ? "Flexy (15% deducted)" : paymentMethod;
}

function toRow(
  order: Awaited<ReturnType<typeof getOrders>>[number],
  salesByOrder: Map<string, Awaited<ReturnType<typeof getFinanceReports>>["sales"][number]>,
  adminsById: Map<string, Awaited<ReturnType<typeof getFinanceReports>>["admins"][number]>,
): TigerNewSheetRow {
  const subscription = order.products.length ? order.products.map((item) => item.name).join(" + ") : "Manual order";
  const duration = order.products.length ? order.products.map((item) => item.option || item.duration).join(" + ") : "";
  const sale = salesByOrder.get(order.id);
  const amountPaid = flexyAmountPaid(order.paymentMethod, subscription, duration, order.total);
  const costPrice = sale ? Number(sale.card_cost_dzd) : 0;
  const commissionDzd = sale ? Number(sale.commission_dzd) : 0;
  return {
    orderId: order.id,
    client: order.customerName || "Customer details incomplete",
    subscription,
    duration,
    costPrice: sale ? String(costPrice) : "",
    amountPaid: String(amountPaid),
    spend: "",
    cost: "",
    netProfit: String(amountPaid - costPrice - commissionDzd),
    paymentMethod: sheetPaymentMethod(order.paymentMethod),
    admin: displayAdmin(sale ? adminsById.get(String(sale.admin_telegram_user_id)) : undefined),
  };
}

type CertificateState = { order_id: string; customer_details_complete: boolean; form_submitted_at: string | null };

export async function getTigerNewSheetData(): Promise<TigerNewSheetData> {
  const client = getSupabaseServiceClient();
  const [{ data: exports, error: exportsError }, { data: copyEvents, error: copyEventsError }, orders, finance] = await Promise.all([
    client.from("order_sheet_exports").select("order_id, copied_at, warranty_issued_at").order("warranty_issued_at", { ascending: true }),
    client.from("operation_events").select("entity_id, action").eq("entity_type", "order").eq("action", "tiger_new_sheet_incomplete_copied"),
    getOrders(),
    getFinanceReports(),
  ]);
  if (exportsError) throw new Error("Tiger New Sheet could not be loaded.");
  if (copyEventsError) throw new Error("Tiger New Sheet copy state could not be loaded.");

  const exportRows = exports ?? [];
  const exportIds = exportRows.map((entry) => String(entry.order_id));
  const { data: certificates, error: certificatesError } = exportIds.length
    ? await client.from("warranty_certificates").select("order_id, customer_details_complete, form_submitted_at").in("order_id", exportIds)
    : { data: [], error: null };
  if (certificatesError) throw new Error("Tiger New Sheet warranty state could not be loaded.");

  const certificateByOrderId = new Map<string, CertificateState>();
  for (const certificate of certificates ?? []) certificateByOrderId.set(String(certificate.order_id), certificate as CertificateState);
  const incompleteCopiedOrderIds = new Set((copyEvents ?? []).map((event) => String(event.entity_id)));
  const exportByOrderId = new Map(exportRows.map((entry) => [String(entry.order_id), entry]));
  const salesByOrder = new Map(finance.sales.map((sale) => [String(sale.order_id), sale]));
  const adminsById = new Map(finance.admins.map((admin) => [String(admin.telegram_user_id), admin]));
  const includedOrders = orders.filter((order) => certificateByOrderId.has(order.id) && exportByOrderId.has(order.id));
  const isComplete = (orderId: string) => {
    const certificate = certificateByOrderId.get(orderId);
    return Boolean(certificate?.customer_details_complete && certificate.form_submitted_at);
  };

  // Issuing this warranty record happens only after the admin completes the
  // Telegram operation and consumes the assigned activation card. Customer
  // form completion is a separate state and must not delay sale reporting.
  const completedOrders = includedOrders;
  const incompleteOrders = includedOrders.filter((order) => !isComplete(order.id));
  const completedRows = completedOrders.filter((order) => !exportByOrderId.get(order.id)?.copied_at).map((order) => toRow(order, salesByOrder, adminsById));
  const incompleteRows = incompleteOrders.filter((order) => !incompleteCopiedOrderIds.has(order.id)).map((order) => toRow(order, salesByOrder, adminsById));

  return { completedRows, incompleteRows, totals: { all: includedOrders.length, completed: completedOrders.length, incomplete: incompleteOrders.length } };
}

/** Backwards-compatible completed-only accessor for older server callers. */
export async function getTigerNewSheetRows(): Promise<TigerNewSheetRow[]> {
  return (await getTigerNewSheetData()).completedRows;
}

export async function markTigerNewSheetRowsCopied(orderIds: string[], scope: TigerNewSheetScope) {
  if (!orderIds.length) return [];
  const client = getSupabaseServiceClient();
  const { data: certificates, error: certificatesError } = await client.from("warranty_certificates")
    .select("order_id, customer_details_complete, form_submitted_at").in("order_id", orderIds);
  if (certificatesError) throw new Error("Tiger New Sheet warranty state could not be loaded.");
  const states = new Map((certificates ?? []).map((certificate) => [String(certificate.order_id), certificate as CertificateState]));
  const eligibleOrderIds = orderIds.filter((orderId) => {
    const certificate = states.get(orderId);
    const customerDetailsComplete = Boolean(certificate?.customer_details_complete && certificate.form_submitted_at);
    return scope === "completed" ? Boolean(certificate) : Boolean(certificate) && !customerDetailsComplete;
  });
  if (!eligibleOrderIds.length) return [];
  const copiedAt = new Date().toISOString();
  if (scope === "completed") {
    const { data, error } = await client.from("order_sheet_exports").update({ copied_at: copiedAt })
      .in("order_id", eligibleOrderIds).is("copied_at", null).select("order_id");
    if (error) throw new Error("Tiger New Sheet copy state could not be saved.");
    return (data ?? []).map((row) => String(row.order_id));
  }

  const { data: existingEvents, error: existingError } = await client.from("operation_events").select("entity_id")
    .eq("entity_type", "order").eq("action", "tiger_new_sheet_incomplete_copied").in("entity_id", eligibleOrderIds);
  if (existingError) throw new Error("Tiger New Sheet copy state could not be saved.");
  const existingIds = new Set((existingEvents ?? []).map((event) => String(event.entity_id)));
  const newIds = eligibleOrderIds.filter((orderId) => !existingIds.has(orderId));
  if (newIds.length) {
    const { error } = await client.from("operation_events").insert(newIds.map((orderId) => ({
      entity_type: "order", entity_id: orderId, action: "tiger_new_sheet_incomplete_copied", metadata: {},
    })));
    if (error) throw new Error("Tiger New Sheet copy state could not be saved.");
  }
  return eligibleOrderIds;
}
