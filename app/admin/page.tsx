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
} from "lucide-react";
import {
  StatCard,
  RevenueLineChart,
  PaymentMethodPieChart,
  OrderStatusChart,
  TopProductsTable,
  AccountStockBars,
  ActivityFeed,
  ExportButton,
} from "@/components/admin/DashboardCharts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard",
};

export default async function AdminDashboardPage() {
  const a = await getAnalytics();

  return (
    <AdminShell title="Dashboard" description="Business overview and key metrics at a glance.">
      {/* ── Overview Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Revenue"
          value={formatCurrency(a.totalRevenue)}
          trend={a.revenueGrowthPercent}
          trendLabel="vs last month"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Monthly Revenue"
          value={formatCurrency(a.monthlyRevenue)}
        />
        <StatCard
          icon={<ShoppingBag className="h-5 w-5" />}
          label="Total Orders"
          value={a.totalOrders}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending Orders"
          value={a.pendingOrders}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Completed"
          value={a.completedOrders}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          label="Cancelled"
          value={a.cancelledOrders}
        />
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Total Products"
          value={a.totalProducts}
        />
        <StatCard
          icon={<Key className="h-5 w-5" />}
          label="Available Accounts"
          value={a.availableAccounts}
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          label="Sold Accounts"
          value={a.soldAccounts}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Low Stock Warnings"
          value={a.lowStockWarnings}
        />
      </div>

      {/* ── Smart Insights Row ── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Avg. Order Value</p>
          <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{formatCurrency(a.averageOrderValue)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Conversion Rate</p>
          <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{a.conversionRate}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Best Category</p>
          <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{a.bestSellingCategory}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Stock Value</p>
          <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{formatCurrency(a.totalStockValue)}</p>
        </div>
      </div>

      {/* ── Revenue Chart + Payment Methods ── */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueLineChart data={a.revenueByDay} />
        </div>
        <PaymentMethodPieChart data={a.revenueByPaymentMethod} />
      </div>

      {/* ── Order Status + Top Products ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <OrderStatusChart data={a.ordersByStatus} />
        <TopProductsTable products={a.topProducts} />
      </div>

      {/* ── Account Stock + Activity Feed ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AccountStockBars data={a.accountStock} />
        <ActivityFeed activities={a.recentActivity} />
      </div>

      {/* ── Export Buttons ── */}
      <div className="mt-6 flex flex-wrap gap-3">
        <ExportButton href="/admin/statistics/export?type=orders" label="Export Orders" />
        <ExportButton href="/admin/statistics/export?type=products" label="Export Products" />
        <ExportButton href="/admin/statistics/export?type=accounts" label="Export Accounts" />
        <ExportButton href="/admin/statistics/export?type=revenue" label="Export Revenue" />
      </div>
    </AdminShell>
  );
}
