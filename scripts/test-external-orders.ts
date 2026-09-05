import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/2026-09-03-external-orders-as-sales.sql", "utf8");
const operations = readFileSync("lib/telegram-operations.ts", "utf8");
const warranties = readFileSync("lib/telegram-warranty.ts", "utf8");
const costMigration = readFileSync("supabase/migrations/2026-09-05-external-order-card-costs.sql", "utf8");
const validation = readFileSync("lib/validation.ts", "utf8");

assert.match(migration, /create or replace function public\.create_external_snapchat_sale/i);
assert.match(migration, /insert into public\.orders/i);
assert.match(migration, /insert into public\.finance_sales/i);
assert.match(migration, /insert into public\.warranty_certificates/i);
assert.match(migration, /insert into public\.commissions/i);
assert.match(migration, /sale_source[\s\S]+external/i);
assert.match(operations, /absoluteUrl\(`\/w\/\$\{sale\.token\}`\)/);
assert.doesNotMatch(operations, /createDirectWarrantyLink/);
assert.match(warranties, /createExternalSnapchatSale/);
assert.match(warranties, /public_token_hash: tokenHashes\(token\)\[0\]/);
assert.match(operations, /🏷️ Reduction/);
assert.match(operations, /#reduction:/);
assert.match(operations, /totalDzd/);
assert.match(operations, /claimSnapchatCard\(identity\.userId, planMonths, cardType\)/);
assert.match(operations, /apps\.apple\.com\/redeem\?code=/);
assert.match(operations, /ds\|\$\{operation\.operationId\}\|\$\{allocatedAmount\}\|complete/);
assert.match(warranties, /input\.totalDzd \?\? configuredPlan\.priceDzd/);
assert.match(warranties, /externalCardTypeByPlan/);
assert.match(warranties, /card_cost_usd_cents: cardCostUsdCents/);
assert.match(warranties, /card_cost_dzd: externalCardCostDzd/);
assert.match(warranties, /configuredPlan\.priceDzd - commissionDzd - externalCardCostDzd/);
assert.match(costMigration, /create_external_snapchat_sale_v2/i);
assert.match(costMigration, /p_total - p_commission - p_card_cost_dzd/i);
assert.match(costMigration, /where sale\.sale_source = 'external'/i);
assert.match(costMigration, /sale\.card_type = 'external'/i);
assert.match(validation, /z\.literal\("rq"\)/);
assert.match(validation, /z\.literal\("ds"\)/);

console.log("External orders use stored normal-order warranties and finance records.");
