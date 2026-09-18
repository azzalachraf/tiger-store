import assert from "node:assert/strict";
import { calculateAdminCycleStatistics } from "../lib/admin-cycle-statistics";

const sales = [
  { commission_dzd: 100, completed_at: "2026-08-31T09:00:00.000Z" },
  { commission_dzd: 100, completed_at: "2026-08-31T11:00:00.000Z" },
];

assert.deepEqual(calculateAdminCycleStatistics(sales, null), { completedOrders: 2, creditDzd: 200, settledAt: null });
assert.deepEqual(calculateAdminCycleStatistics(sales, "2026-08-31T10:00:00.000Z"), { completedOrders: 1, creditDzd: 100, settledAt: "2026-08-31T10:00:00.000Z" });
assert.deepEqual(
  calculateAdminCycleStatistics(sales, null, { start: "2026-08-31", end: "2026-08-31" }),
  { completedOrders: 2, creditDzd: 200, settledAt: null },
);
assert.deepEqual(
  calculateAdminCycleStatistics(sales, null, { start: "2026-09-01", end: "2026-09-30" }),
  { completedOrders: 0, creditDzd: 0, settledAt: null },
);
console.log("admin payment-cycle statistics reset correctly after a full settlement");
