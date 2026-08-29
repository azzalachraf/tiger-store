import assert from "node:assert/strict";
import { buildOwnerAnalytics } from "../lib/owner-analytics-core";

const report = buildOwnerAnalytics(
  { start: "2026-08-29", end: "2026-08-29", label: "today" },
  [
    { order_id: "one", admin_telegram_user_id: "10", plan_months: 1, revenue_dzd: 600, commission_dzd: 100, card_cost_dzd: 135, completed_at: "2026-08-29T10:00:00+01:00" },
    { order_id: "two", admin_telegram_user_id: "11", plan_months: 1, revenue_dzd: 600, commission_dzd: 100, card_cost_dzd: 135, completed_at: "2026-08-29T11:00:00+01:00" },
  ],
  [{ id: "ad", spend_date: "2026-08-29", amount_usd_cents: 125, source_id: "instagram" }],
  250,
  4,
);
assert.equal(report.advertisingDzd, 312);
assert.equal(report.netProfitDzd, 418);
assert.equal(report.inventoryAvailable, 4);
assert.deepEqual(report.missingAdvertisingDates, []);
console.log("owner analytics allocation and missing-advertising checks passed");
