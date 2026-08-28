import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cardsForPlan, isSnapchatCardType, isSnapchatPlan, sheetCardType } from "../lib/snapchat-card-mapping";

assert.deepEqual(cardsForPlan(1), ["try_24", "try_48"]);
assert.deepEqual(cardsForPlan(12), ["inr_199", "inr_298"]);
assert.equal(isSnapchatPlan(6), true);
assert.equal(isSnapchatPlan(4), false);
assert.equal(isSnapchatCardType("try_229"), true);
assert.equal(sheetCardType(" 100 INR "), "inr_100");
assert.equal(sheetCardType("unknown"), null);

// The database migration is the concurrency boundary. Its claim function uses
// row locks with SKIP LOCKED, and its finish function returns a cancelled code
// to available status while completion consumes it.
const migration = readFileSync("supabase/migrations/2026-08-28-snapchat-redeem-operations.sql", "utf8");
assert.match(migration, /for update skip locked/i);
assert.match(migration, /then 'consumed'/i);
assert.match(migration, /else 'available'/i);
assert.match(migration, /unique index if not exists snapchat_operations_active_card_idx/i);
assert.doesNotMatch(migration, /redeem_card_id uuid not null unique/i);
console.log("snapchat operations mapping and atomic-transition checks passed");
