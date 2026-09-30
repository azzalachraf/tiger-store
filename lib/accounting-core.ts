export const accountingPaymentMethods = ["BaridiMob", "Flexy", "Binance", "RedotPay"] as const;
export type AccountingPaymentMethod = (typeof accountingPaymentMethods)[number];
export type AccountingKind = "sale" | "expense" | "transfer" | "opening_balance";

export type AccountingAccount = {
  id: string;
  code: string;
  name: string;
  paymentMethod: AccountingPaymentMethod;
  active: boolean;
};

export type AccountingTransaction = {
  id: string;
  kind: AccountingKind;
  amountDzd: number;
  occurredOn: string;
  accountId: string;
  transferAccountId: string | null;
  orderId: string | null;
  paymentMethod: AccountingPaymentMethod | null;
  reference: string;
  note: string;
  createdByEmail: string;
  createdAt: string;
};

export type ReconciliationOrder = {
  id: string;
  date: string;
  paymentMethod: string;
  amountDzd: number;
};

export type ReconciliationRow = {
  date: string;
  paymentMethod: AccountingPaymentMethod;
  paidOrdersDzd: number;
  recordedDzd: number;
  differenceDzd: number;
  orderCount: number;
  recordCount: number;
};

export type AccountingAlert = {
  key: string;
  level: "warning" | "error";
  message: string;
};

export function calculateAccountBalances(accounts: AccountingAccount[], transactions: AccountingTransaction[]) {
  const balances = new Map(accounts.map((account) => [account.id, 0]));
  for (const entry of transactions) {
    if (entry.kind === "sale" || entry.kind === "opening_balance") {
      balances.set(entry.accountId, (balances.get(entry.accountId) ?? 0) + entry.amountDzd);
    } else {
      balances.set(entry.accountId, (balances.get(entry.accountId) ?? 0) - entry.amountDzd);
    }
    if (entry.kind === "transfer" && entry.transferAccountId) {
      balances.set(entry.transferAccountId, (balances.get(entry.transferAccountId) ?? 0) + entry.amountDzd);
    }
  }
  return accounts.map((account) => ({ ...account, balanceDzd: balances.get(account.id) ?? 0 }));
}

export function reconcileAccounting(orders: ReconciliationOrder[], transactions: AccountingTransaction[]) {
  const methods = new Set<string>(accountingPaymentMethods);
  const groups = new Map<string, ReconciliationRow>();
  const row = (date: string, paymentMethod: AccountingPaymentMethod) => {
    const key = `${date}|${paymentMethod}`;
    const existing = groups.get(key);
    if (existing) return existing;
    const created: ReconciliationRow = { date, paymentMethod, paidOrdersDzd: 0, recordedDzd: 0, differenceDzd: 0, orderCount: 0, recordCount: 0 };
    groups.set(key, created);
    return created;
  };
  for (const order of orders) {
    if (!methods.has(order.paymentMethod)) continue;
    const current = row(order.date, order.paymentMethod as AccountingPaymentMethod);
    current.paidOrdersDzd += order.amountDzd;
    current.orderCount += 1;
  }
  for (const entry of transactions) {
    if (entry.kind !== "sale" || !entry.paymentMethod) continue;
    const current = row(entry.occurredOn, entry.paymentMethod);
    current.recordedDzd += entry.amountDzd;
    current.recordCount += 1;
  }
  const rows = [...groups.values()].map((item) => ({ ...item, differenceDzd: item.recordedDzd - item.paidOrdersDzd }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.paymentMethod.localeCompare(b.paymentMethod));

  const alerts: AccountingAlert[] = [];
  const saleEntriesByOrder = new Map<string, AccountingTransaction[]>();
  for (const entry of transactions) if (entry.kind === "sale" && entry.orderId) {
    const entries = saleEntriesByOrder.get(entry.orderId) ?? [];
    entries.push(entry);
    saleEntriesByOrder.set(entry.orderId, entries);
  }
  for (const order of orders) {
    if (!methods.has(order.paymentMethod)) continue;
    const entries = saleEntriesByOrder.get(order.id) ?? [];
    if (!entries.length) alerts.push({ key: `missing-${order.id}`, level: "warning", message: `Order ${order.id} has no recorded money entry.` });
    if (entries.length > 1) alerts.push({ key: `duplicate-${order.id}`, level: "error", message: `Order ${order.id} has ${entries.length} money entries.` });
    const recorded = entries.reduce((sum, entry) => sum + entry.amountDzd, 0);
    if (entries.length && recorded !== order.amountDzd) alerts.push({ key: `amount-${order.id}`, level: "error", message: `Order ${order.id} differs by ${recorded - order.amountDzd} DA.` });
  }
  const knownOrders = new Set(orders.map((order) => order.id));
  for (const [orderId] of saleEntriesByOrder) if (!knownOrders.has(orderId)) {
    alerts.push({ key: `orphan-${orderId}`, level: "error", message: `Money entry for order ${orderId} has no paid order in this date range.` });
  }
  return {
    rows,
    alerts,
    unmatchedDzd: rows.reduce((sum, item) => sum + Math.abs(item.differenceDzd), 0),
  };
}

export function calculateAccountingMetrics(input: {
  sales: { revenueDzd: number; costDzd: number; adminCreditDzd: number }[];
  advertisingDzd: number;
  transactions: AccountingTransaction[];
  totalNetWorthDzd: number;
  unmatchedDzd: number;
}) {
  const totalSalesDzd = input.sales.reduce((sum, sale) => sum + sale.revenueDzd, 0);
  const grossProfitDzd = input.sales.reduce((sum, sale) => sum + sale.revenueDzd - sale.costDzd - sale.adminCreditDzd, 0);
  const expensesDzd = input.transactions.filter((entry) => entry.kind === "expense").reduce((sum, entry) => sum + entry.amountDzd, 0);
  return {
    totalSalesDzd,
    netProfitDzd: grossProfitDzd - input.advertisingDzd - expensesDzd,
    totalNetWorthDzd: input.totalNetWorthDzd,
    unmatchedDzd: input.unmatchedDzd,
  };
}
