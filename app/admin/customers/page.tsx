import { getAnalytics, formatCurrency } from "@/lib/analytics";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard, ExportButton } from "@/components/admin/DashboardCharts";
import { Users, UserPlus, UserCheck, Repeat, Banknote, History } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customers Intelligence",
};

export default async function AdminCustomersPage() {
  const a = await getAnalytics();

  return (
    <AdminShell title="Customers Intelligence" description="Detailed customer metrics and history.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total Customers" value={a.customerCount} />
        <StatCard icon={<UserPlus className="h-5 w-5" />} label="New Customers" value={a.newCustomers} />
        <StatCard icon={<UserCheck className="h-5 w-5" />} label="Returning Customers" value={a.returningCustomers} />
        <StatCard icon={<Repeat className="h-5 w-5" />} label="Repeat Purchase Rate" value={`${a.repeatPurchaseRate.toFixed(1)}%`} />
        <StatCard icon={<History className="h-5 w-5" />} label="Average Order Value" value={formatCurrency(a.averageOrderValue)} />
        <StatCard icon={<Banknote className="h-5 w-5" />} label="Customer Lifetime Value" value={formatCurrency(a.customerLifetimeValue)} />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-white">Top Customers</h2>
          <ExportButton href="/admin/statistics/export?type=customers" label="Export CSV" />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black">
          <table className="w-full text-left text-sm text-white">
            <thead className="bg-white/[0.02]">
              <tr>
                <th className="px-4 py-3 font-bold text-white/50">Name</th>
                <th className="px-4 py-3 font-bold text-white/50">Email</th>
                <th className="px-4 py-3 font-bold text-white/50">Orders</th>
                <th className="px-4 py-3 font-bold text-white/50">Total Spent</th>
                <th className="px-4 py-3 font-bold text-white/50">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {a.customers.slice(0, 100).map((c, i) => (
                <tr key={c.email + i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name || "—"}</td>
                  <td className="px-4 py-3 text-white/70">{c.email}</td>
                  <td className="px-4 py-3 font-medium">{c.orderCount}</td>
                  <td className="px-4 py-3 font-bold text-tiger-gold">{formatCurrency(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-white/70">{new Date(c.lastOrder).toLocaleDateString("en-US")}</td>
                </tr>
              ))}
              {a.customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
