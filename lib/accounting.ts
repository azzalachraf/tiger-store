import "server-only";

import { getOrders } from "@/lib/admin-store";
import { getFinanceReports } from "@/lib/finance";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { calculateAccountBalances, calculateAccountingMetrics, reconcileAccounting, type AccountingAccount, type AccountingKind, type AccountingPaymentMethod, type AccountingTransaction } from "@/lib/accounting-core";

type PeriodRow = { id: string; name: string; starts_on: string; ends_on: string | null; status: "open" | "closed" };
type AccountRow = { id: string; code: string; name: string; payment_method: AccountingPaymentMethod; active: boolean };
type TransactionRow = { id: string; kind: AccountingKind; amount_dzd: number; occurred_on: string; account_id: string; transfer_account_id: string | null; order_id: string | null; payment_method: AccountingPaymentMethod | null; reference: string; note: string; created_by_email: string; created_at: string };
type ResetRow = { id: string; period_id: string; admin_telegram_user_id: string | number; effective_at: string; previous_commission_dzd: number; previous_paid_dzd: number; previous_adjustments_dzd: number; previous_outstanding_dzd: number; reason: string };

function transactionFromRow(row: TransactionRow): AccountingTransaction {
  return { id: row.id, kind: row.kind, amountDzd: Number(row.amount_dzd), occurredOn: row.occurred_on, accountId: row.account_id, transferAccountId: row.transfer_account_id, orderId: row.order_id, paymentMethod: row.payment_method, reference: row.reference, note: row.note, createdByEmail: row.created_by_email, createdAt: row.created_at };
}

export async function getAccountingDashboard(input: { periodId?: string; start: string; end: string }) {
  const client = getSupabaseServiceClient();
  const [periodResult, accountResult, transactionResult, resetResult, reports, orders] = await Promise.all([
    client.from("accounting_periods").select("id, name, starts_on, ends_on, status").order("starts_on", { ascending: false }),
    client.from("accounting_accounts").select("id, code, name, payment_method, active").order("name"),
    client.from("accounting_transactions").select("id, kind, amount_dzd, occurred_on, account_id, transfer_account_id, order_id, payment_method, reference, note, created_by_email, created_at").order("occurred_on", { ascending: false }).order("created_at", { ascending: false }),
    client.from("admin_balance_resets").select("id, period_id, admin_telegram_user_id, effective_at, previous_commission_dzd, previous_paid_dzd, previous_adjustments_dzd, previous_outstanding_dzd, reason").order("effective_at", { ascending: false }),
    getFinanceReports(),
    getOrders(),
  ]);
  if (periodResult.error || accountResult.error || transactionResult.error || resetResult.error) throw new Error("Accounting dashboard data could not be loaded.");
  const periods = (periodResult.data ?? []) as PeriodRow[];
  const selectedPeriod = periods.find((period) => period.id === input.periodId) ?? periods.find((period) => period.status === "open") ?? periods[0];
  if (!selectedPeriod) throw new Error("No accounting period exists.");
  const rangeStart = input.start < selectedPeriod.starts_on ? selectedPeriod.starts_on : input.start;
  const periodEnd = selectedPeriod.ends_on ?? input.end;
  const rangeEnd = input.end > periodEnd ? periodEnd : input.end;
  const accounts: AccountingAccount[] = ((accountResult.data ?? []) as AccountRow[]).map((account) => ({ id: account.id, code: account.code, name: account.name, paymentMethod: account.payment_method, active: account.active }));
  const allTransactions = ((transactionResult.data ?? []) as TransactionRow[]).map(transactionFromRow);
  const periodTransactions = allTransactions.filter((entry) => entry.occurredOn >= selectedPeriod.starts_on && (!selectedPeriod.ends_on || entry.occurredOn <= selectedPeriod.ends_on));
  const filteredTransactions = periodTransactions.filter((entry) => entry.occurredOn >= rangeStart && entry.occurredOn <= rangeEnd);
  const paidOrders = orders.filter((order) => ["paid", "delivered"].includes(order.status) && order.createdAt.slice(0, 10) >= rangeStart && order.createdAt.slice(0, 10) <= rangeEnd);
  const reconciliation = reconcileAccounting(paidOrders.map((order) => ({ id: order.id, date: order.createdAt.slice(0, 10), paymentMethod: order.paymentMethod, amountDzd: order.total })), filteredTransactions);
  const balances = calculateAccountBalances(accounts, periodTransactions.filter((entry) => entry.occurredOn <= rangeEnd));
  const financeByOrder = new Map(reports.sales.map((sale) => [String(sale.order_id), sale]));
  const sales = paidOrders.map((order) => {
    const known = financeByOrder.get(order.id);
    return { revenueDzd: order.total, costDzd: known ? Number(known.card_cost_dzd) : 0, adminCreditDzd: known ? Number(known.commission_dzd) : 0, costKnown: Boolean(known) };
  });
  const advertisingDzd = reports.advertisingSpend.filter((item) => String(item.spend_date) >= rangeStart && String(item.spend_date) <= rangeEnd).reduce((sum, item) => sum + Number(item.amount_dzd), 0);
  const metrics = calculateAccountingMetrics({ sales, advertisingDzd, transactions: filteredTransactions, totalNetWorthDzd: balances.reduce((sum, account) => sum + account.balanceDzd, 0), unmatchedDzd: reconciliation.unmatchedDzd });
  const unknownCostCount = sales.filter((sale) => !sale.costKnown).length;
  return {
    periods,
    selectedPeriod,
    rangeStart,
    rangeEnd,
    accounts: balances,
    transactions: filteredTransactions,
    reconciliation,
    metrics,
    advertisingDzd,
    unknownCostCount,
    resets: ((resetResult.data ?? []) as ResetRow[]).filter((reset) => reset.period_id === selectedPeriod.id),
    paidOrders: paidOrders.map((order) => ({ id: order.id, label: `${order.id} · ${order.total} DA · ${order.paymentMethod}`, method: order.paymentMethod })),
  };
}
