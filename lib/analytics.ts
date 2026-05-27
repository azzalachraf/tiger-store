import "server-only";

import { getProducts, getOrders, getAccounts } from "@/lib/admin-store";
import type { AdminOrder, AdminAccount } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Analytics = {
  // Overview cards
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  todayRevenue: number;
  revenueGrowthPercent: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalProducts: number;
  availableAccounts: number;
  soldAccounts: number;
  expiredAccounts: number;
  problemAccounts: number;
  totalAccounts: number;
  lowStockWarnings: number;

  // Revenue charts
  revenueByDay: { date: string; revenue: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  revenueByPaymentMethod: { method: string; revenue: number; count: number }[];

  // Order analytics
  ordersByStatus: { status: string; count: number }[];
  recentOrders: AdminOrder[];

  // Product performance
  topProducts: {
    id: string;
    name: string;
    image: string;
    revenue: number;
    salesCount: number;
    category: string;
  }[];
  productsByCategory: { category: string; count: number; revenue: number }[];

  // Account stock
  accountStock: {
    label: string;
    available: number;
    sold: number;
    expired: number;
    problem: number;
    total: number;
  }[];

  // Activity feed
  recentActivity: {
    type: "order" | "account_sold" | "account_added" | "product_update";
    description: string;
    timestamp: string;
  }[];

  // Smart calculations
  averageOrderValue: number;
  bestSellingCategory: string;
  totalStockValue: number;
  conversionRate: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function formatCurrency(value: number): string {
  return (
    new Intl.NumberFormat("en-DZ", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value) + " DA"
  );
}

/** Returns true for orders that count as revenue-generating. */
function isRevenueOrder(order: AdminOrder): boolean {
  return order.status === "paid" || order.status === "delivered";
}

/** Safely parse a date string; returns null on failure. */
function safeDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a Date to YYYY-MM-DD. */
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Format a Date to YYYY-MM. */
function toMonthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/** Start of day (00:00:00) for a given date. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Start of week (Monday 00:00:00) for a given date. */
function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const s = startOfDay(d);
  s.setDate(s.getDate() - diff);
  return s;
}

/** Start of month (1st, 00:00:00) for a given date. */
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Derive a stock label from an account. */
function accountStockLabel(account: AdminAccount): string {
  // Use notes if it looks like a product reference
  if (account.notes && account.notes.trim().length > 0) {
    const note = account.notes.trim();
    // If the note is short enough to be a product label, use it
    if (note.length <= 60) return note;
  }
  // Fall back to email domain
  const atIdx = account.email.indexOf("@");
  if (atIdx > 0) {
    const domain = account.email.slice(atIdx + 1).toLowerCase();
    // Use the domain root (e.g. "gmail.com" → "gmail")
    const dotIdx = domain.indexOf(".");
    return dotIdx > 0 ? domain.slice(0, dotIdx) : domain;
  }
  return "Other";
}

/* ------------------------------------------------------------------ */
/*  Main analytics function                                            */
/* ------------------------------------------------------------------ */

export async function getAnalytics(): Promise<Analytics> {
  const [products, orders, accounts] = await Promise.all([
    getProducts(),
    getOrders(),
    getAccounts(),
  ]);

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // -----------------------------------------------------------------
  // Revenue computations
  // -----------------------------------------------------------------
  const revenueOrders = orders.filter(isRevenueOrder);

  const totalRevenue = revenueOrders.reduce((s, o) => s + o.total, 0);

  const monthlyRevenue = revenueOrders.reduce((s, o) => {
    const d = safeDate(o.createdAt);
    return d && d >= monthStart ? s + o.total : s;
  }, 0);

  const weeklyRevenue = revenueOrders.reduce((s, o) => {
    const d = safeDate(o.createdAt);
    return d && d >= weekStart ? s + o.total : s;
  }, 0);

  const todayRevenue = revenueOrders.reduce((s, o) => {
    const d = safeDate(o.createdAt);
    return d && d >= todayStart ? s + o.total : s;
  }, 0);

  // Previous month revenue
  const prevMonthRevenue = revenueOrders.reduce((s, o) => {
    const d = safeDate(o.createdAt);
    return d && d >= prevMonthStart && d < monthStart ? s + o.total : s;
  }, 0);

  const revenueGrowthPercent =
    prevMonthRevenue === 0
      ? monthlyRevenue > 0
        ? 100
        : 0
      : ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;

  // -----------------------------------------------------------------
  // Order counts
  // -----------------------------------------------------------------
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const completedOrders = orders.filter(
    (o) => o.status === "paid" || o.status === "delivered"
  ).length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;

  // -----------------------------------------------------------------
  // Products
  // -----------------------------------------------------------------
  const totalProducts = products.length;

  // -----------------------------------------------------------------
  // Accounts
  // -----------------------------------------------------------------
  const availableAccounts = accounts.filter((a) => a.status === "Available").length;
  const soldAccounts = accounts.filter((a) => a.status === "Sold").length;
  const expiredAccounts = accounts.filter((a) => a.status === "Expired").length;
  const problemAccounts = accounts.filter((a) => a.status === "Problem").length;
  const totalAccounts = accounts.length;

  // -----------------------------------------------------------------
  // Account stock grouped by label
  // -----------------------------------------------------------------
  const stockMap = new Map<
    string,
    { available: number; sold: number; expired: number; problem: number; total: number }
  >();

  for (const acc of accounts) {
    const label = accountStockLabel(acc);
    const entry = stockMap.get(label) ?? {
      available: 0,
      sold: 0,
      expired: 0,
      problem: 0,
      total: 0,
    };
    entry.total += 1;
    switch (acc.status) {
      case "Available":
        entry.available += 1;
        break;
      case "Sold":
        entry.sold += 1;
        break;
      case "Expired":
        entry.expired += 1;
        break;
      case "Problem":
        entry.problem += 1;
        break;
    }
    stockMap.set(label, entry);
  }

  const accountStock = Array.from(stockMap.entries())
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.total - a.total);

  // Low stock warnings: labels where available < 3
  const lowStockWarnings = accountStock.filter((s) => s.available < 3).length;

  // -----------------------------------------------------------------
  // Revenue by day (last 30 days)
  // -----------------------------------------------------------------
  const dayMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayMap.set(toDateKey(d), 0);
  }
  for (const o of revenueOrders) {
    const d = safeDate(o.createdAt);
    if (!d) continue;
    const key = toDateKey(d);
    if (dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) ?? 0) + o.total);
    }
  }
  const revenueByDay = Array.from(dayMap.entries()).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  // -----------------------------------------------------------------
  // Revenue by month (last 12 months)
  // -----------------------------------------------------------------
  const monthMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthMap.set(toMonthKey(d), 0);
  }
  for (const o of revenueOrders) {
    const d = safeDate(o.createdAt);
    if (!d) continue;
    const key = toMonthKey(d);
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) ?? 0) + o.total);
    }
  }
  const revenueByMonth = Array.from(monthMap.entries()).map(([month, revenue]) => ({
    month,
    revenue,
  }));

  // -----------------------------------------------------------------
  // Revenue by payment method
  // -----------------------------------------------------------------
  const pmMap = new Map<string, { revenue: number; count: number }>();
  for (const method of ["BaridiMob", "CCP", "RedotPay"]) {
    pmMap.set(method, { revenue: 0, count: 0 });
  }
  for (const o of revenueOrders) {
    const entry = pmMap.get(o.paymentMethod) ?? { revenue: 0, count: 0 };
    entry.revenue += o.total;
    entry.count += 1;
    pmMap.set(o.paymentMethod, entry);
  }
  const revenueByPaymentMethod = Array.from(pmMap.entries()).map(
    ([method, { revenue, count }]) => ({ method, revenue, count })
  );

  // -----------------------------------------------------------------
  // Orders by status
  // -----------------------------------------------------------------
  const statusCounts = new Map<string, number>();
  for (const s of ["pending", "paid", "delivered", "cancelled"]) {
    statusCounts.set(s, 0);
  }
  for (const o of orders) {
    statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1);
  }
  const ordersByStatus = Array.from(statusCounts.entries()).map(
    ([status, count]) => ({ status, count })
  );

  // -----------------------------------------------------------------
  // Recent orders (last 10)
  // -----------------------------------------------------------------
  const recentOrders = orders.slice(0, 10);

  // -----------------------------------------------------------------
  // Top products (aggregated from order cart items)
  // -----------------------------------------------------------------
  const productPerf = new Map<
    string,
    { id: string; name: string; image: string; revenue: number; salesCount: number; category: string }
  >();

  // Build a product lookup for categories
  const productLookup = new Map(products.map((p) => [p.id, p]));

  for (const order of revenueOrders) {
    for (const item of order.products ?? []) {
      const existing = productPerf.get(item.productId);
      const cat = productLookup.get(item.productId)?.category ?? "Other";
      if (existing) {
        existing.revenue += item.price * item.quantity;
        existing.salesCount += item.quantity;
      } else {
        productPerf.set(item.productId, {
          id: item.productId,
          name: item.name,
          image: item.image,
          revenue: item.price * item.quantity,
          salesCount: item.quantity,
          category: cat,
        });
      }
    }
  }

  const topProducts = Array.from(productPerf.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // -----------------------------------------------------------------
  // Products by category
  // -----------------------------------------------------------------
  const catMap = new Map<string, { count: number; revenue: number }>();
  for (const p of products) {
    const entry = catMap.get(p.category) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    catMap.set(p.category, entry);
  }
  // Add revenue from top product data
  for (const tp of productPerf.values()) {
    const entry = catMap.get(tp.category);
    if (entry) {
      entry.revenue += tp.revenue;
    }
  }
  const productsByCategory = Array.from(catMap.entries())
    .map(([category, { count, revenue }]) => ({ category, count, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // -----------------------------------------------------------------
  // Activity feed
  // -----------------------------------------------------------------
  type ActivityItem = Analytics["recentActivity"][number];
  const activities: ActivityItem[] = [];

  // Add recent orders
  for (const o of orders.slice(0, 15)) {
    activities.push({
      type: "order",
      description: `Order #${o.id.slice(0, 8)} from ${o.customerName} — ${formatCurrency(o.total)} (${o.status})`,
      timestamp: o.createdAt,
    });
  }

  // Add recent sold accounts
  for (const a of accounts.filter((a) => a.status === "Sold").slice(0, 10)) {
    activities.push({
      type: "account_sold",
      description: `Account ${a.email} marked as sold`,
      timestamp: a.updatedAt,
    });
  }

  // Add recently added accounts
  for (const a of accounts.slice(0, 10)) {
    const created = safeDate(a.dateCreated);
    if (created && created >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) {
      activities.push({
        type: "account_added",
        description: `Account ${a.email} added to inventory`,
        timestamp: a.dateCreated,
      });
    }
  }

  // Sort by timestamp descending and limit to 20
  const recentActivity = activities
    .sort((a, b) => {
      const da = safeDate(a.timestamp)?.getTime() ?? 0;
      const db = safeDate(b.timestamp)?.getTime() ?? 0;
      return db - da;
    })
    .slice(0, 20);

  // -----------------------------------------------------------------
  // Smart calculations
  // -----------------------------------------------------------------
  const averageOrderValue =
    completedOrders > 0 ? totalRevenue / completedOrders : 0;

  const bestSellingCategory =
    productsByCategory.length > 0 ? productsByCategory[0].category : "N/A";

  // Total value of available account stock
  const totalStockValue = accounts
    .filter((a) => a.status === "Available")
    .reduce((s, a) => s + a.price, 0);

  // Conversion rate: completed / total as percentage
  const conversionRate =
    totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  // -----------------------------------------------------------------
  // Return
  // -----------------------------------------------------------------
  return {
    totalRevenue,
    monthlyRevenue,
    weeklyRevenue,
    todayRevenue,
    revenueGrowthPercent: Math.round(revenueGrowthPercent * 100) / 100,
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalProducts,
    availableAccounts,
    soldAccounts,
    expiredAccounts,
    problemAccounts,
    totalAccounts,
    lowStockWarnings,
    revenueByDay,
    revenueByMonth,
    revenueByPaymentMethod,
    ordersByStatus,
    recentOrders,
    topProducts,
    productsByCategory,
    accountStock,
    recentActivity,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    bestSellingCategory,
    totalStockValue,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}
