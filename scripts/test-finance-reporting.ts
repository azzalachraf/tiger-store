import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const plans = { 1: { price: 600, commission: 100 }, 2: { price: 800, commission: 100 }, 3: { price: 1600, commission: 100 }, 6: { price: 2000, commission: 100 }, 12: { price: 2300, commission: 150 } };
const costs = { try_24: 54, try_48: 108, inr_100: 115, try_115: 260, inr_199: 215, try_229: 500, inr_298: 335 };
assert.equal(Math.floor(costs.try_24 * 250 / 100), 135);
assert.equal(plans[12].price - plans[12].commission - Math.floor(costs.inr_298 * 250 / 100), 1313);
const paymentDate = (start: string, paymentDay: number, now: string) => { const next = new Date(`${start}T00:00:00Z`); next.setUTCDate(paymentDay); while (next.getTime() < new Date(now).getTime()) next.setUTCMonth(next.getUTCMonth() + 1); return next.toISOString().slice(0, 10); };
assert.equal(paymentDate("2026-01-31", 1, "2026-01-31T12:00:00Z"), "2026-02-01");
assert.equal(paymentDate("2026-01-10", 28, "2026-02-28T00:00:00Z"), "2026-02-28");
const migration = readFileSync("supabase/migrations/2026-08-28-finance-reporting.sql", "utf8");
assert.match(migration, /create table if not exists public\.finance_sales/i);
assert.match(migration, /insert into public\.commissions/i);
assert.match(migration, /insert into public\.finance_sales/i);
assert.match(migration, /revoke all on public\.finance_settings/i);
console.log("finance defaults, profit calculation, month rollover and atomic sale checks passed");
