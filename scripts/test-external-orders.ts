import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/2026-09-03-external-orders-as-sales.sql", "utf8");
const operations = readFileSync("lib/telegram-operations.ts", "utf8");
const warranties = readFileSync("lib/telegram-warranty.ts", "utf8");

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

console.log("External orders use stored normal-order warranties and finance records.");
