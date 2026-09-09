import { AdminShell } from "@/components/admin/AdminShell";
import { Overview } from "@/components/admin/Overview";
import { getProducts } from "@/lib/admin-store";
import { readAdminOrders } from "./read-orders";
import { getFinanceReports } from "@/lib/finance";
import { financialLedger } from "@/components/admin/financial-result";
import { requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Overview" };
export default async function AdminDashboardPage() {
  await requireAdmin();
  const [orders, products, reports] = await Promise.all([
    readAdminOrders(),
    getProducts(),
    getFinanceReports(),
  ]);
  return (
    <AdminShell
      title="Overview"
      description="Your sales, order pipeline and catalog at a glance."
    >
      <Overview
        orders={orders}
        {...financialLedger(orders, reports)}
        availableProducts={products.filter((p) => p.available).length}
      />
    </AdminShell>
  );
}
