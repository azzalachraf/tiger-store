import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateAccountBalances, calculateAccountingMetrics, reconcileAccounting, type AccountingAccount, type AccountingTransaction } from "../lib/accounting-core";

const accounts: AccountingAccount[] = [
  { id: "baridi", code: "baridimob", name: "BaridiMob", paymentMethod: "BaridiMob", active: true },
  { id: "binance", code: "binance", name: "Binance", paymentMethod: "Binance", active: true },
];
const transactions: AccountingTransaction[] = [
  { id: "opening", kind: "opening_balance", amountDzd: 1000, occurredOn: "2026-09-30", accountId: "baridi", transferAccountId: null, orderId: null, paymentMethod: null, reference: "", note: "", createdByEmail: "owner@example.com", createdAt: "2026-09-30T08:00:00Z" },
  { id: "sale", kind: "sale", amountDzd: 600, occurredOn: "2026-09-30", accountId: "baridi", transferAccountId: null, orderId: "order-1", paymentMethod: "BaridiMob", reference: "", note: "", createdByEmail: "owner@example.com", createdAt: "2026-09-30T09:00:00Z" },
  { id: "transfer", kind: "transfer", amountDzd: 400, occurredOn: "2026-09-30", accountId: "baridi", transferAccountId: "binance", orderId: null, paymentMethod: null, reference: "", note: "", createdByEmail: "owner@example.com", createdAt: "2026-09-30T10:00:00Z" },
  { id: "expense", kind: "expense", amountDzd: 100, occurredOn: "2026-09-30", accountId: "binance", transferAccountId: null, orderId: null, paymentMethod: null, reference: "", note: "", createdByEmail: "owner@example.com", createdAt: "2026-09-30T11:00:00Z" },
];

const balances = calculateAccountBalances(accounts, transactions);
assert.equal(balances.find((account) => account.id === "baridi")?.balanceDzd, 1200);
assert.equal(balances.find((account) => account.id === "binance")?.balanceDzd, 300);
assert.equal(balances.reduce((sum, account) => sum + account.balanceDzd, 0), 1500, "transfer must not change net worth");

const reconciliation = reconcileAccounting([{ id: "order-1", date: "2026-09-30", paymentMethod: "BaridiMob", amountDzd: 600 }], transactions);
assert.equal(reconciliation.unmatchedDzd, 0);
assert.equal(reconciliation.alerts.length, 0);
const duplicate = reconcileAccounting([{ id: "order-1", date: "2026-09-30", paymentMethod: "BaridiMob", amountDzd: 600 }], [...transactions, { ...transactions[1], id: "sale-2" }]);
assert.ok(duplicate.alerts.some((alert) => alert.key === "duplicate-order-1"));
assert.equal(duplicate.unmatchedDzd, 600);

const metrics = calculateAccountingMetrics({ sales: [{ revenueDzd: 600, costDzd: 135, adminCreditDzd: 100 }], advertisingDzd: 50, transactions, totalNetWorthDzd: 1500, unmatchedDzd: 0 });
assert.equal(metrics.totalSalesDzd, 600);
assert.equal(metrics.netProfitDzd, 215, "profit deducts cost, admin credit, advertising and expenses");
assert.equal(metrics.totalNetWorthDzd, 1500);

const migration = readFileSync("supabase/migrations/2026-09-30-accounting-dashboard.sql", "utf8");
assert.match(migration, /kind in \('sale', 'expense', 'transfer', 'opening_balance'\)/);
assert.match(migration, /Opening reset for the accounting period/);
assert.doesNotMatch(migration, /insert into public\.admin_payments[\s\S]*Opening reset/i);
assert.match(migration, /revoke all on public\.accounting_periods/);
assert.match(migration, /grant execute on function public\.record_accounting_sale[\s\S]*service_role/);
console.log("account balances, transfer isolation, reconciliation, profit and reset audit checks passed");
