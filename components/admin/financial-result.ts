import type { AdminOrder } from "@/lib/types";
import type { getFinanceReports } from "@/lib/finance";
import type { LedgerSale, LedgerSpend } from "./FinanceLedger";
import { localDay } from "./data-tools";

export function financialLedger(
  orders: AdminOrder[],
  reports: Pick<
    Awaited<ReturnType<typeof getFinanceReports>>,
    "sales" | "admins" | "advertisingSpend"
  >,
) {
  const orderMap = new Map(orders.map((order) => [order.id, order]));
  const ids = new Set(reports.sales.map((sale) => String(sale.order_id)));
  const names = new Map(
    reports.admins.map((admin) => [
      String(admin.telegram_user_id),
      admin.first_name || admin.username || "Former admin",
    ]),
  );
  const sales: LedgerSale[] = reports.sales
    .filter(
      (sale) =>
        !["cancelled", "refunded"].includes(
          orderMap.get(String(sale.order_id))?.status ?? "",
        ),
    )
    .map((sale) => ({
      id: String(sale.order_id),
      adminId: String(sale.admin_telegram_user_id),
      admin: String(
        names.get(String(sale.admin_telegram_user_id)) || "Former admin",
      ),
      plan: Number(sale.plan_months),
      date: String(sale.completed_at),
      revenue: Number(sale.revenue_dzd),
      cost: Number(sale.card_cost_dzd),
      credit: Number(sale.commission_dzd),
    }));
  for (const order of orders)
    if (order.status === "delivered" && !ids.has(order.id))
      sales.push({
        id: order.id,
        adminId: "website",
        admin: "Website",
        plan: 0,
        date: order.createdAt,
        revenue: order.total,
        cost: 0,
        credit: 0,
      });
  const spend: LedgerSpend[] = reports.advertisingSpend.map((row) => ({
    date: String(row.spend_date),
    amount: Number(row.amount_dzd),
    platform: String(row.platform),
  }));
  return { sales, spend };
}

export function financialSeries(
  sales: LedgerSale[],
  spend: LedgerSpend[],
  deductAds = true,
) {
  const days = new Map<
    string,
    { date: string; revenue: number; net: number }
  >();
  const day = (date: string) => {
    if (!days.has(date)) days.set(date, { date, revenue: 0, net: 0 });
    return days.get(date)!;
  };
  for (const sale of sales) {
    const row = day(localDay(sale.date));
    row.revenue += sale.revenue;
    row.net += sale.revenue - sale.cost - sale.credit;
  }
  if (deductAds) for (const ad of spend) day(ad.date).net -= ad.amount;
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
