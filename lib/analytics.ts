import "server-only";

import { getProducts, getOrders, getAccounts } from "@/lib/admin-store";
import { AdminOrder, AdminAccount, CustomerProfile } from "@/lib/types";

export type Analytics = {
  totalRevenue: number;
  netRevenue: number;
  grossRevenue: number;
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  revenueGrowthPercent: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  averageOrderValue: number;
  productsSold: number;
  customerCount: number;
  newCustomers: number;
  returningCustomers: number;
  customerLifetimeValue: number;
  repeatPurchaseRate: number;
  totalProducts: number;
  availableAccounts: number;
  soldAccounts: number;
  expiredAccounts: number;
  problemAccounts: number;
  totalAccounts: number;
  lowStockWarnings: number;
  revenueByDay: { date: string; revenue: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  revenueByPaymentMethod: { method: string; revenue: number; count: number }[];
  ordersByStatus: { status: string; count: number }[];
  recentOrders: AdminOrder[];
  topProducts: {
    id: string;
    name: string;
    image: string;
    revenue: number;
    salesCount: number;
    category: string;
  }[];
  productsByCategory: { category: string; count: number; revenue: number }[];
  accountStock: {
    label: string;
    available: number;
    sold: number;
    expired: number;
    problem: number;
    total: number;
  }[];
  recentActivity: { type: string; description: string; timestamp: string }[];
  bestSellingCategory: string;
  totalStockValue: number;
  conversionRate: number;
  customers: CustomerProfile[];
};

export function formatCurrency(value: number): string {
  return `${value.toLocaleString("en-US")} DA`;
}

function safeDate(value: string | undefined): Date {
  if (!value) return new Date();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function toMonthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function startOfMonth(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(1);
  return r;
}

function startOfYear(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setMonth(0, 1);
  return r;
}

function accountStockLabel(acc: AdminAccount) {
  if (acc.notes && acc.notes.length > 0 && acc.notes.length <= 60) {
    return acc.notes;
  }
  return acc.email.split("@")[1] || "Other";
}

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
  const yearStart = startOfYear(now);

  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

  let totalRevenue = 0;
  let todayRevenue = 0;
  let weeklyRevenue = 0;
  let monthlyRevenue = 0;
  let yearlyRevenue = 0;
  let prevMonthlyRevenue = 0;
  let productsSold = 0;

  let completedOrders = 0;
  let pendingOrders = 0;
  let cancelledOrders = 0;
  let refundedOrders = 0;

  const paymentMethodStats = new Map<string, { revenue: number; count: number }>();
  const productStats = new Map<string, { name: string; image: string; category: string; salesCount: number; revenue: number }>();
  const categoryStats = new Map<string, { count: number; revenue: number }>();

  // Use a map for customers by lowercased email
  const customerMap = new Map<string, CustomerProfile>();

  const revenueByDayMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    revenueByDayMap.set(toDateKey(d), 0);
  }

  const revenueByMonthMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    revenueByMonthMap.set(toMonthKey(d), 0);
  }

  for (const order of orders) {
    const isPaid = order.status === "paid" || order.status === "delivered";
    const d = safeDate(order.createdAt);
    const dayKey = toDateKey(d);
    const monthKey = toMonthKey(d);
    const total = Number(order.total) || 0;
    
    if (order.status === "pending") pendingOrders++;
    else if (order.status === "cancelled") cancelledOrders++;
    else if (order.status === "refunded") refundedOrders++;
    else if (isPaid) completedOrders++;

    // Customer tracking
    if (order.email) {
      const emailKey = order.email.toLowerCase();
      const existing = customerMap.get(emailKey) || {
        email: emailKey,
        name: order.customerName,
        totalSpent: 0,
        orderCount: 0,
        firstOrder: order.createdAt,
        lastOrder: order.createdAt,
        averageOrderValue: 0,
        isReturning: false,
      };

      existing.orderCount++;
      if (isPaid) existing.totalSpent += total;
      
      const orderDate = new Date(order.createdAt).getTime();
      if (orderDate < new Date(existing.firstOrder).getTime()) existing.firstOrder = order.createdAt;
      if (orderDate > new Date(existing.lastOrder).getTime()) {
        existing.lastOrder = order.createdAt;
        existing.name = order.customerName; // update name to most recent
      }
      existing.averageOrderValue = existing.totalSpent / existing.orderCount;
      existing.isReturning = existing.orderCount > 1;

      customerMap.set(emailKey, existing);
    }

    if (isPaid) {
      totalRevenue += total;

      if (d >= todayStart) todayRevenue += total;
      if (d >= weekStart) weeklyRevenue += total;
      if (d >= monthStart) monthlyRevenue += total;
      if (d >= yearStart) yearlyRevenue += total;
      if (d >= prevMonthStart && d < monthStart) prevMonthlyRevenue += total;

      const pStats = paymentMethodStats.get(order.paymentMethod) || { revenue: 0, count: 0 };
      pStats.revenue += total;
      pStats.count += 1;
      paymentMethodStats.set(order.paymentMethod, pStats);

      if (revenueByDayMap.has(dayKey)) {
        revenueByDayMap.set(dayKey, revenueByDayMap.get(dayKey)! + total);
      }
      if (revenueByMonthMap.has(monthKey)) {
        revenueByMonthMap.set(monthKey, revenueByMonthMap.get(monthKey)! + total);
      }

      for (const item of order.products) {
        productsSold += item.quantity;
        const pId = item.productId;
        const itemRevenue = item.price * item.quantity;
        
        const existingP = productStats.get(pId) || {
          name: item.name,
          image: item.image,
          category: "Uncategorized",
          salesCount: 0,
          revenue: 0,
        };
        existingP.salesCount += item.quantity;
        existingP.revenue += itemRevenue;
        productStats.set(pId, existingP);
      }
    }
  }

  // Calculate customer metrics
  const customers = Array.from(customerMap.values());
  const customerCount = customers.length;
  const returningCustomers = customers.filter(c => c.isReturning).length;
  const newCustomers = customerCount - returningCustomers;
  const customerLifetimeValue = customerCount > 0 ? totalRevenue / customerCount : 0;
  const repeatPurchaseRate = customerCount > 0 ? (returningCustomers / customerCount) * 100 : 0;

  let revenueGrowthPercent = 0;
  if (prevMonthlyRevenue > 0) {
    revenueGrowthPercent = ((monthlyRevenue - prevMonthlyRevenue) / prevMonthlyRevenue) * 100;
  } else if (monthlyRevenue > 0) {
    revenueGrowthPercent = 100;
  }

  // Populate categories for products
  for (const product of products) {
    const stat = productStats.get(product.id);
    if (stat) stat.category = product.category;
  }

  for (const stat of productStats.values()) {
    const cat = categoryStats.get(stat.category) || { count: 0, revenue: 0 };
    cat.count += stat.salesCount;
    cat.revenue += stat.revenue;
    categoryStats.set(stat.category, cat);
  }

  const topProducts = Array.from(productStats.entries())
    .map(([id, stat]) => ({ id, ...stat }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const productsByCategory = Array.from(categoryStats.entries())
    .map(([category, stat]) => ({ category, ...stat }))
    .sort((a, b) => b.revenue - a.revenue);

  let bestSellingCategory = "—";
  if (productsByCategory.length > 0) {
    bestSellingCategory = productsByCategory[0].category;
  }

  const revenueByPaymentMethod = Array.from(paymentMethodStats.entries())
    .map(([method, stat]) => ({ method, ...stat }))
    .sort((a, b) => b.revenue - a.revenue);

  let availableAccounts = 0;
  let soldAccounts = 0;
  let expiredAccounts = 0;
  let problemAccounts = 0;
  let totalStockValue = 0;

  const stockMap = new Map<string, { available: number; sold: number; expired: number; problem: number }>();

  for (const acc of accounts) {
    const lbl = accountStockLabel(acc);
    const existing = stockMap.get(lbl) || { available: 0, sold: 0, expired: 0, problem: 0 };

    if (acc.status === "Available") {
      availableAccounts++;
      existing.available++;
      totalStockValue += Number(acc.price) || 0;
    } else if (acc.status === "Sold") {
      soldAccounts++;
      existing.sold++;
    } else if (acc.status === "Expired") {
      expiredAccounts++;
      existing.expired++;
    } else if (acc.status === "Problem") {
      problemAccounts++;
      existing.problem++;
    }

    stockMap.set(lbl, existing);
  }

  const accountStock = Array.from(stockMap.entries())
    .map(([label, stat]) => ({
      label,
      ...stat,
      total: stat.available + stat.sold + stat.expired + stat.problem,
    }))
    .sort((a, b) => b.available - a.available);

  const lowStockWarnings = accountStock.filter((s) => s.available > 0 && s.available < 3).length;

  const recentActivity: { type: string; description: string; timestamp: string }[] = [];
  
  orders.slice(0, 15).forEach(o => {
    recentActivity.push({
      type: o.status === "paid" ? "Sale" : "Order",
      description: `Order from ${o.customerName || "Customer"} (${formatCurrency(o.total)})`,
      timestamp: o.createdAt,
    });
  });

  accounts.filter(a => a.status === "Sold").sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10).forEach(a => {
    recentActivity.push({
      type: "Account",
      description: `Sold ${accountStockLabel(a)} account`,
      timestamp: a.updatedAt,
    });
  });

  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
  const conversionRate = orders.length > 0 ? (completedOrders / orders.length) * 100 : 0;

  return {
    totalRevenue,
    netRevenue: totalRevenue, // For now, assuming net = gross as there are no refunds/costs captured directly in revenue sum
    grossRevenue: totalRevenue,
    todayRevenue,
    weeklyRevenue,
    monthlyRevenue,
    yearlyRevenue,
    revenueGrowthPercent,
    totalOrders: orders.length,
    completedOrders,
    pendingOrders,
    cancelledOrders,
    refundedOrders,
    averageOrderValue,
    productsSold,
    customerCount,
    newCustomers,
    returningCustomers,
    customerLifetimeValue,
    repeatPurchaseRate,
    totalProducts: products.length,
    availableAccounts,
    soldAccounts,
    expiredAccounts,
    problemAccounts,
    totalAccounts: accounts.length,
    lowStockWarnings,
    revenueByDay: Array.from(revenueByDayMap.entries()).map(([date, revenue]) => ({ date, revenue })),
    revenueByMonth: Array.from(revenueByMonthMap.entries()).map(([month, revenue]) => ({ month, revenue })),
    revenueByPaymentMethod,
    ordersByStatus: [
      { status: "paid", count: completedOrders },
      { status: "pending", count: pendingOrders },
      { status: "cancelled", count: cancelledOrders },
      { status: "refunded", count: refundedOrders },
    ],
    recentOrders: orders.slice(0, 10),
    topProducts,
    productsByCategory,
    accountStock,
    recentActivity: recentActivity.slice(0, 20),
    bestSellingCategory,
    totalStockValue,
    conversionRate,
    customers: customers.sort((a, b) => b.totalSpent - a.totalSpent),
  };
}
