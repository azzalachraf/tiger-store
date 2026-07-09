import { getAnalytics, formatCurrency } from "@/lib/analytics";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Key,
  Users,
  UserPlus,
  UserCheck,
  Repeat,
  Banknote,
  RotateCcw,
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

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Statistics",
};

export default async function AdminStatisticsPage() {
  const a = await getAnalytics();

  return (
    <AdminShell title="Statistics & Analytics" description="Comprehensive business intelligence dashboard.">

      {/* ════════════════════════════════════════════════
          1. Revenue Overview
          ════════════════════════════════════════════════ */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-white">Revenue Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Total Revenue"
            value={formatCurrency(a.totalRevenue)}
            trend={a.revenueGrowthPercent}
            trendLabel="vs last month"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Monthly"
            value={formatCurrency(a.monthlyRevenue)}
          />
          <StatCard
            icon={<Banknote className="h-5 w-5" />}
            label="Weekly"
            value={formatCurrency(a.weeklyRevenue)}
          />
          <StatCard
            icon={<Banknote className="h-5 w-5" />}
            label="Today"
            value={formatCurrency(a.todayRevenue)}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <RevenueLineChart data={a.revenueByDay} />
          <MonthlyRevenueBarChart data={a.revenueByMonth} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          2. Order Analytics
          ════════════════════════════════════════════════ */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-extrabold text-white">Order Analytics</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Total Orders" value={a.totalOrders} />
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={a.completedOrders} />
          <StatCard icon={<Clock className="h-5 w-5" />} label="Pending" value={a.pendingOrders} />
          <StatCard icon={<XCircle className="h-5 w-5" />} label="Cancelled" value={a.cancelledOrders} />
          <StatCard icon={<RotateCcw className="h-5 w-5" />} label="Refunded" value={a.refundedOrders} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <OrderStatusChart data={a.ordersByStatus} />
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <h3 className="mb-4 font-extrabold text-white">Recent Orders</h3>
            <div className="grid gap-2">
              {a.recentOrders.slice(0, 8).map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">{order.customerName || "—"}</p>
                    <p className="text-xs text-white/45">{order.paymentMethod} · {new Date(order.createdAt).toLocaleDateString("en-US")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-tiger-gold">{formatCurrency(order.total)}</p>
                    <span className={`text-xs font-bold ${order.status === "paid" || order.status === "delivered" ? "text-emerald-400" : order.status === "cancelled" || order.status === "refunded" ? "text-red-400" : "text-yellow-400"}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          3. Customer Analytics
          ════════════════════════════════════════════════ */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-extrabold text-white">Customer Analytics</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Users className="h-5 w-5" />} label="Total Customers" value={a.customerCount} />
          <StatCard icon={<UserPlus className="h-5 w-5" />} label="New Customers" value={a.newCustomers} />
          <StatCard icon={<UserCheck className="h-5 w-5" />} label="Returning" value={a.returningCustomers} />
          <StatCard icon={<Repeat className="h-5 w-5" />} label="Repeat Rate" value={`${a.repeatPurchaseRate.toFixed(1)}%`} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Avg. Order Value</p>
            <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{formatCurrency(a.averageOrderValue)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Customer Lifetime Value</p>
            <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{formatCurrency(a.customerLifetimeValue)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Products Sold</p>
            <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{a.productsSold}</p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          4. Product Performance
          ════════════════════════════════════════════════ */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-extrabold text-white">Product Performance</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={<Package className="h-5 w-5" />} label="Total Products" value={a.totalProducts} />
          <StatCard icon={<Target className="h-5 w-5" />} label="Best Category" value={a.bestSellingCategory || "—"} />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Conversion Rate" value={`${a.conversionRate.toFixed(1)}%`} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TopProductsTable products={a.topProducts} />
          <CategoryRevenueChart data={a.productsByCategory} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          5. Account Stock
          ════════════════════════════════════════════════ */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-extrabold text-white">Account Stock</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={<Key className="h-5 w-5" />} label="Total" value={a.totalAccounts} />
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Available" value={a.availableAccounts} />
          <StatCard icon={<UserCheck className="h-5 w-5" />} label="Sold" value={a.soldAccounts} />
          <StatCard icon={<Clock className="h-5 w-5" />} label="Expired" value={a.expiredAccounts} />
          <StatCard icon={<XCircle className="h-5 w-5" />} label="Problem" value={a.problemAccounts} />
        </div>
        <div className="mt-4">
          <AccountStockBars data={a.accountStock} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          6. Payment Methods + Activity
          ════════════════════════════════════════════════ */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-extrabold text-white">Payment & Activity</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <PaymentMethodPieChart data={a.revenueByPaymentMethod} />
          <ActivityFeed activities={a.recentActivity} />
        </div>
      </section>

      {/* ── Exports ── */}
      <div className="mt-8 flex flex-wrap gap-3">
        <ExportButton href="/admin/statistics/export?type=orders" label="Export Orders" />
        <ExportButton href="/admin/statistics/export?type=products" label="Export Products" />
        <ExportButton href="/admin/statistics/export?type=accounts" label="Export Accounts" />
        <ExportButton href="/admin/statistics/export?type=revenue" label="Export Revenue" />
        <ExportButton href="/admin/statistics/export?type=customers" label="Export Customers" />
      </div>
    </AdminShell>
  );
}
