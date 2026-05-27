import { getAnalytics, formatCurrency } from "@/lib/analytics";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Key,
  UserCheck,
  AlertTriangle,
  Calendar,
  CreditCard,
  BarChart3,
  Target,
} from "lucide-react";
import {
  StatCard,
  RevenueLineChart,
  MonthlyRevenueBarChart,
  PaymentMethodPieChart,
  OrderStatusChart,
  CategoryRevenueChart,
  TopProductsTable,
  AccountStockBars,
  ActivityFeed,
  ExportButton,
} from "@/components/admin/DashboardCharts";
import { formatPriceDZD } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Statistics - Admin",
};

export default async function AdminStatisticsPage() {
  const a = await getAnalytics();

  return (
    <AdminShell title="Statistics" description="Detailed analytics, charts, and business intelligence.">

      {/* ════════════════════════════════════════════════════════════
          SECTION 1: Revenue Overview
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-white">
          <DollarSign className="h-5 w-5 text-tiger-ember" />
          Revenue Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Total Revenue"
            value={formatCurrency(a.totalRevenue)}
            trend={a.revenueGrowthPercent}
            trendLabel="vs last month"
          />
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            label="Monthly Revenue"
            value={formatCurrency(a.monthlyRevenue)}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Weekly Revenue"
            value={formatCurrency(a.weeklyRevenue)}
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Today Revenue"
            value={formatCurrency(a.todayRevenue)}
          />
        </div>

        {/* Revenue Charts */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <RevenueLineChart data={a.revenueByDay} />
          <MonthlyRevenueBarChart data={a.revenueByMonth} />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 2: Order Analytics
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-white">
          <ShoppingBag className="h-5 w-5 text-tiger-ember" />
          Order Analytics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<ShoppingBag className="h-5 w-5" />}
            label="Total Orders"
            value={a.totalOrders}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Completed"
            value={a.completedOrders}
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Pending"
            value={a.pendingOrders}
          />
          <StatCard
            icon={<XCircle className="h-5 w-5" />}
            label="Cancelled"
            value={a.cancelledOrders}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <OrderStatusChart data={a.ordersByStatus} />

          {/* Recent Orders Table */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <h3 className="mb-4 text-lg font-extrabold text-white">Recent Orders</h3>
            {a.recentOrders.length === 0 ? (
              <p className="text-sm text-white/40">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-white/40">
                      <th className="pb-3 pr-3">Customer</th>
                      <th className="pb-3 pr-3">Payment</th>
                      <th className="pb-3 pr-3 text-right">Total</th>
                      <th className="pb-3 pr-3">Status</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.recentOrders.map((order) => {
                      const statusColor: Record<string, string> = {
                        pending: "text-yellow-400 bg-yellow-400/15",
                        paid: "text-emerald-400 bg-emerald-400/15",
                        delivered: "text-blue-400 bg-blue-400/15",
                        cancelled: "text-red-400 bg-red-400/15",
                      };
                      const cls = statusColor[order.status] ?? "text-white/60 bg-white/10";
                      return (
                        <tr
                          key={order.id}
                          className="border-b border-white/5 transition-colors hover:bg-white/[0.04]"
                        >
                          <td className="py-3 pr-3">
                            <p className="font-bold text-white">{order.customerName}</p>
                            <p className="text-xs text-white/40">{order.email}</p>
                          </td>
                          <td className="py-3 pr-3 text-xs font-bold text-white/60">
                            {order.paymentMethod}
                          </td>
                          <td className="py-3 pr-3 text-right font-bold text-tiger-gold">
                            {formatPriceDZD(order.total, "en")}
                          </td>
                          <td className="py-3 pr-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${cls}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-white/40">
                            {new Date(order.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 3: Product Performance
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-white">
          <Package className="h-5 w-5 text-tiger-ember" />
          Product Performance
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={<Package className="h-5 w-5" />}
            label="Total Products"
            value={a.totalProducts}
          />
          <StatCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Best Category"
            value={a.bestSellingCategory}
          />
          <StatCard
            icon={<Target className="h-5 w-5" />}
            label="Top Seller"
            value={a.topProducts[0]?.name ?? "N/A"}
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TopProductsTable products={a.topProducts} />
          <CategoryRevenueChart data={a.productsByCategory} />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 4: Account Stock
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-white">
          <Key className="h-5 w-5 text-tiger-ember" />
          Account Stock
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            icon={<Key className="h-5 w-5" />}
            label="Total Accounts"
            value={a.totalAccounts}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Available"
            value={a.availableAccounts}
          />
          <StatCard
            icon={<UserCheck className="h-5 w-5" />}
            label="Sold"
            value={a.soldAccounts}
          />
          <StatCard
            icon={<XCircle className="h-5 w-5" />}
            label="Expired"
            value={a.expiredAccounts}
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Problem"
            value={a.problemAccounts}
          />
        </div>
        <div className="mt-4">
          <AccountStockBars data={a.accountStock} />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 5: Payment Methods
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-white">
          <CreditCard className="h-5 w-5 text-tiger-ember" />
          Payment Method Analytics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {a.revenueByPaymentMethod.map((pm) => (
            <div
              key={pm.method}
              className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 transition-all duration-300 hover:border-tiger-ember/30"
            >
              <p className="text-sm font-bold text-white/58">{pm.method}</p>
              <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{formatCurrency(pm.revenue)}</p>
              <p className="mt-1 text-xs text-white/40">{pm.count} orders</p>
            </div>
          ))}
        </div>
        <div className="mt-4 max-w-lg">
          <PaymentMethodPieChart data={a.revenueByPaymentMethod} />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 6: Smart Calculations
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-white">
          <BarChart3 className="h-5 w-5 text-tiger-ember" />
          Business Insights
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-tiger-ember/10 to-transparent p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Average Order Value</p>
            <p className="mt-2 text-2xl font-extrabold text-white">{formatCurrency(a.averageOrderValue)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Conversion Rate</p>
            <p className="mt-2 text-2xl font-extrabold text-white">{a.conversionRate}%</p>
            <p className="mt-1 text-xs text-white/40">completed / total orders</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-tiger-gold/10 to-transparent p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Total Stock Value</p>
            <p className="mt-2 text-2xl font-extrabold text-white">{formatCurrency(a.totalStockValue)}</p>
            <p className="mt-1 text-xs text-white/40">available accounts × price</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Revenue Growth</p>
            <p className={`mt-2 text-2xl font-extrabold ${a.revenueGrowthPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {a.revenueGrowthPercent >= 0 ? "+" : ""}{a.revenueGrowthPercent}%
            </p>
            <p className="mt-1 text-xs text-white/40">this month vs last month</p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 7: Activity Feed
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-white">
          <Clock className="h-5 w-5 text-tiger-ember" />
          Recent Activity
        </h2>
        <div className="max-w-2xl">
          <ActivityFeed activities={a.recentActivity} />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 8: Export Data
          ════════════════════════════════════════════════════════════ */}
      <div className="mb-4">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-white">
          <Package className="h-5 w-5 text-tiger-ember" />
          Export Data
        </h2>
        <div className="flex flex-wrap gap-3">
          <ExportButton href="/admin/statistics/export?type=orders" label="Export Orders CSV" />
          <ExportButton href="/admin/statistics/export?type=products" label="Export Products CSV" />
          <ExportButton href="/admin/statistics/export?type=accounts" label="Export Accounts CSV" />
          <ExportButton href="/admin/statistics/export?type=revenue" label="Export Revenue CSV" />
        </div>
      </div>
    </AdminShell>
  );
}
