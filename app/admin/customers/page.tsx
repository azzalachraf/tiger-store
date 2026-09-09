import { getAnalytics, formatCurrency } from "@/lib/analytics";
import { readAdminOrders } from "@/app/admin/read-orders";
import { CustomersWorkspace } from "@/components/admin/CustomersWorkspace";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/DashboardCharts";
import {
  Users,
  UserPlus,
  UserCheck,
  Repeat,
  Banknote,
  History,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customers Intelligence",
};

export default async function AdminCustomersPage() {
  const a = await getAnalytics(await readAdminOrders());

  return (
    <AdminShell
      title="Customers Intelligence"
      description="Detailed customer metrics and history."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Customers"
          value={a.customerCount}
        />
        <StatCard
          icon={<UserPlus className="h-5 w-5" />}
          label="New Customers"
          value={a.newCustomers}
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          label="Returning Customers"
          value={a.returningCustomers}
        />
        <StatCard
          icon={<Repeat className="h-5 w-5" />}
          label="Repeat Purchase Rate"
          value={`${a.repeatPurchaseRate.toFixed(1)}%`}
        />
        <StatCard
          icon={<History className="h-5 w-5" />}
          label="Average Order Value"
          value={formatCurrency(a.averageOrderValue)}
        />
        <StatCard
          icon={<Banknote className="h-5 w-5" />}
          label="Customer Lifetime Value"
          value={formatCurrency(a.customerLifetimeValue)}
        />
      </div>

      <div className="mt-8">
        <CustomersWorkspace customers={a.customers} />
      </div>
    </AdminShell>
  );
}
