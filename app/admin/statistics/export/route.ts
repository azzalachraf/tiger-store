import { NextResponse } from "next/server";
import { getAnalytics } from "@/lib/analytics";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const a = await getAnalytics();
  let csv = "";
  let filename = "";

  if (type === "customers") {
    filename = "customers.csv";
    csv = "Name,Email,Orders,Total Spent,First Order,Last Order\n";
    for (const c of a.customers) {
      csv += `"${c.name}","${c.email}",${c.orderCount},${c.totalSpent},"${c.firstOrder}","${c.lastOrder}"\n`;
    }
  } else if (type === "orders") {
    filename = "orders.csv";
    csv = "ID,Date,Customer,Email,Phone,Total,Status,Payment Method,UTM Source,UTM Medium,UTM Campaign\n";
    for (const o of a.recentOrders) {
      csv += `"${o.id}","${o.createdAt}","${o.customerName}","${o.email}","${o.phone}",${o.total},"${o.status}","${o.paymentMethod}","${o.utm_source || ""}","${o.utm_medium || ""}","${o.utm_campaign || ""}"\n`;
    }
  } else if (type === "products") {
    filename = "products.csv";
    csv = "ID,Name,Category,Sales Count,Revenue\n";
    for (const p of a.topProducts) {
      csv += `"${p.id}","${p.name}","${p.category}",${p.salesCount},${p.revenue}\n`;
    }
  } else if (type === "revenue") {
    filename = "revenue_by_day.csv";
    csv = "Date,Revenue\n";
    for (const r of a.revenueByDay) {
      csv += `"${r.date}",${r.revenue}\n`;
    }
  } else if (type === "accounts") {
    filename = "account_stock.csv";
    csv = "Account Type,Available,Sold,Expired,Problem,Total\n";
    for (const s of a.accountStock) {
      csv += `"${s.label}",${s.available},${s.sold},${s.expired},${s.problem},${s.total}\n`;
    }
  }

  // To properly support Arabic characters in Excel, add a BOM
  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
