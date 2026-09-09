import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnalytics } from "@/lib/analytics";
import { requireAdmin } from "@/lib/admin-auth";
import { readAdminOrders } from "@/app/admin/read-orders";
import { reportRange } from "@/components/admin/reporting";
import { filterOrders, revenueSeries } from "@/components/admin/data-tools";
import {
  toCsv,
  orderHeaders,
  orderCells,
  type Cell,
} from "@/components/admin/data-tools";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  await requireAdmin();
  const parsed = z
    .enum(["customers", "orders", "products", "revenue", "accounts"])
    .safeParse(new URL(request.url).searchParams.get("type"));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Choose a valid export type." },
      { status: 400 },
    );
  const type = parsed.data;
  const query = new URL(request.url).searchParams;
  const range = reportRange({
    range: query.get("range") ?? "all",
    start: query.get("start") ?? undefined,
    end: query.get("end") ?? undefined,
  });
  if (range.invalid)
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  const orders = filterOrders(
    await readAdminOrders(),
    "",
    "all",
    range.start,
    range.end,
  );
  let headers: string[] = [];
  let rows: Cell[][] = [];
  if (type === "orders") {
    headers = orderHeaders;
    rows = orders.map(orderCells);
  } else {
    const a = await getAnalytics(orders);
    if (type === "customers") {
      headers = [
        "Name",
        "Email",
        "Orders",
        "Total spent (DA)",
        "First order",
        "Last order",
      ];
      rows = a.customers.map((c) => [
        c.name,
        c.email,
        c.orderCount,
        c.totalSpent,
        c.firstOrder,
        c.lastOrder,
      ]);
    }
    if (type === "products") {
      headers = ["ID", "Name", "Category", "Sales count", "Revenue (DA)"];
      rows = a.topProducts.map((p) => [
        p.id,
        p.name,
        p.category,
        p.salesCount,
        p.revenue,
      ]);
    }
    if (type === "revenue") {
      headers = ["Date", "Revenue (DA)"];
      rows = revenueSeries(orders).map((r) => [r.date, r.revenue]);
    }
    if (type === "accounts") {
      headers = [
        "Account type",
        "Available",
        "Sold",
        "Expired",
        "Problem",
        "Total",
      ];
      rows = a.accountStock.map((s) => [
        s.label,
        s.available,
        s.sold,
        s.expired,
        s.problem,
        s.total,
      ]);
    }
  }
  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="' + type + '.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
