import assert from "node:assert/strict";
import { buildOwnerAnalytics } from "../lib/owner-analytics-core";

const report = buildOwnerAnalytics(
  { start: "2026-08-29", end: "2026-08-29", label: "today" },
  [
    { order_id: "one", admin_telegram_user_id: "10", plan_months: 1, revenue_dzd: 600, commission_dzd: 100, card_cost_dzd: 135, completed_at: "2026-08-29T10:00:00+01:00" },
    { order_id: "two", admin_telegram_user_id: "11", plan_months: 1, revenue_dzd: 600, commission_dzd: 100, card_cost_dzd: 135, completed_at: "2026-08-29T11:00:00+01:00" },
    { order_id: "website", admin_telegram_user_id: "website", plan_months: 0, revenue_dzd: 1000, commission_dzd: 0, card_cost_dzd: 0, completed_at: "2026-08-29T12:00:00+01:00", source: "website" },
  ],
  [{ id: "ad", spend_date: "2026-08-29", amount_usd_cents: 125, source_id: "instagram" }],
  250,
  4,
  { "10": "@lalo", "11": "@other" },
);
assert.equal(report.advertisingDzd, 312);
assert.equal(report.telegramOrders, 2);
assert.equal(report.websiteOrders, 1);
assert.equal(report.totalOrders, 3);
assert.equal(report.adminLabels["10"], "@lalo");
assert.equal(report.telegramNetProfitDzd, 522);
assert.equal(report.websiteNetProfitDzd, 896);
assert.equal(report.netProfitDzd, 1418);
assert.equal(report.inventoryAvailable, 4);
assert.deepEqual(report.missingAdvertisingDates, []);
console.log("owner analytics allocation and missing-advertising checks passed");
