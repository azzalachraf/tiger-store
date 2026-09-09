import { AdminShell } from "@/components/admin/AdminShell";
import { Overview } from "@/components/admin/Overview";
import { getProducts } from "@/lib/admin-store";
import { readAdminOrders } from "./read-orders";
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Overview" };
export default async function AdminDashboardPage() {
  const [orders, products] = await Promise.all([
    readAdminOrders(),
    getProducts(),
  ]);
  return (
    <AdminShell
      title="Overview"
      description="Your sales, order pipeline and catalog at a glance."
    >
      <Overview
        orders={orders}
        availableProducts={products.filter((p) => p.available).length}
      />
    </AdminShell>
  );
}
