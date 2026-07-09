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
  Users,
  UserPlus,
  UserCheck,
  AlertTriangle,
  BarChart3,
  Repeat,
  Banknote,
  RotateCcw,
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
      {/* ── Revenue Cards ── */}
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
          label="Monthly Revenue"
          value={formatCurrency(a.monthlyRevenue)}
        />
        <StatCard
          icon={<Banknote className="h-5 w-5" />}
          label="Today"
          value={formatCurrency(a.todayRevenue)}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Avg. Order Value"
          value={formatCurrency(a.averageOrderValue)}
        />
      </div>

      {/* ── Order & Customer Cards ── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          icon={<Users className="h-5 w-5" />}
          label="Total Customers"
          value={a.customerCount}
        />
      </div>

      {/* ── Business Intelligence Row ── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Products Sold</p>
          <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{a.productsSold}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Returning Customers</p>
          <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{a.returningCustomers}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Repeat Purchase Rate</p>
          <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{a.repeatPurchaseRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">Customer Lifetime Value</p>
          <p className="mt-2 text-2xl font-extrabold text-tiger-gold">{formatCurrency(a.customerLifetimeValue)}</p>
        </div>
      </div>

      {/* ── More Insights ── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<XCircle className="h-5 w-5" />} label="Cancelled" value={a.cancelledOrders} />
        <StatCard icon={<RotateCcw className="h-5 w-5" />} label="Refunded" value={a.refundedOrders} />
        <StatCard icon={<Package className="h-5 w-5" />} label="Total Products" value={a.totalProducts} />
        <StatCard icon={<Key className="h-5 w-5" />} label="Available Accounts" value={a.availableAccounts} />
        <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Low Stock" value={a.lowStockWarnings} />
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
