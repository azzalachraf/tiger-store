import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { telegramCallbackDataSchema } from "../lib/validation";
import * as mapping from "../lib/snapchat-card-mapping";
import { getProductOffers } from "../lib/cart";
import { products } from "../data/products";

let role = "admin";
let claims = 0;
let saleAmount = 0;
const messages: Record<string, unknown>[] = [];
const operationId = "b964657e-9b61-4e05-b787-b902a2fa1a7c";
const user = () => ({ telegram_user_id: "100", interface_locale: "ar", role, registration_id: "TG-TEST1234" });
function query(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "update", "insert", "limit"]) chain[method] = () => chain;
  chain.maybeSingle = async () => ({ data: table === "telegram_users" ? user() : null, error: null });
  chain.then = (resolve: (value: unknown) => void) => resolve({ data: table === "telegram_users" ? [user()] : [], error: null });
  return chain;
}
const dependencies: Record<string, unknown> = {
  "server-only": {},
  "@/lib/env": { getServerEnv: () => ({ TELEGRAM_BOT_TOKEN: "test-only", TELEGRAM_OWNER_ID: role === "owner" ? "100" : "200" }) },
  "@/lib/supabase": { getSupabaseServiceClient: () => ({ from: query }) },
  "@/lib/validation": { telegramCallbackDataSchema },
  "@/lib/snapchat-cards": mapping,
  "@/lib/snapchat-operations": { claimSnapchatCard: async () => { claims++; return { operationId, code: "TEST-ONLY" }; } },
  "@/lib/telegram-warranty": { completeSnapchatSale: async (input: { totalDzd: number }) => { saleAmount = input.totalDzd; return { token: "test" }; } },
  "@/lib/seo": { absoluteUrl: (path: string) => `https://example.test${path}` },
  "@/lib/admin-compensation": { clearCustomCommissionInput: async () => {}, takeCustomCommissionInput: async () => null },
};
const exported = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync("lib/telegram-operations.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  module: exported, exports: exported.exports,
  require: (name: string) => dependencies[name] ?? {},
  fetch: async (_url: string, init: { body: string }) => { messages.push(JSON.parse(init.body)); return { ok: true }; },
  console, Date, Number, String, Math, Set, Map,
});
type HandlerInput = { userId: number; chatId: number; chatType: string; text?: string; data?: string; callbackId?: string; replyToText?: string };
const handlers = exported.exports as { handleTelegramOperationsMessage: (input: HandlerInput) => Promise<void>; handleTelegramOperationsCallback: (input: HandlerInput) => Promise<void> };
const base = { userId: 100, chatId: 100, chatType: "private" };
const message = (text: string, replyToText?: string) => handlers.handleTelegramOperationsMessage({ ...base, text, replyToText });
const callback = (data: string) => handlers.handleTelegramOperationsCallback({ ...base, data, callbackId: "test" });
const lastText = () => String(messages.at(-1)?.text);

async function main() {
  await message("/menu");
  const adminMenu = JSON.stringify(messages.at(-1));
  const menuRows = () => (messages.at(-1)?.reply_markup as { keyboard: { text: string }[][] }).keyboard;
  assert.deepEqual(menuRows().map(row => row.length), [2, 2]);
  for (const removed of ["Free trial", "Website orders", "Owner controls", "English", "العربية"]) assert.equal(adminMenu.includes(removed), false);
  await message("/trial"); assert.match(lastText(), /Not authorised/);
  await callback("tr|12"); assert.match(lastText(), /owner-only/);
  await callback("sc|3"); assert.match(lastText(), /no longer available/);
  await callback("sc|6"); assert.match(lastText(), /no longer available/);
  await message("/website_orders"); assert.match(lastText(), /website admin panel/);
  await callback("wo|TEST"); assert.match(lastText(), /website admin panel/);
  await message("/external_order"); assert.match(JSON.stringify(messages.at(-1)), /Reduction/);
  await callback("ed"); assert.match(lastText(), /Choose the Snapchat Plus offer/);
  await callback("rd|12"); assert.match(lastText(), /How much did you sell/); assert.equal(claims, 0);
  await message("1000", "#reductionprice:12"); assert.match(JSON.stringify(messages.at(-1)), /rp\|12\|inr_199\|1000/); assert.equal(claims, 0);
  await message("-10", "#reductionprice:12"); assert.match(lastText(), /valid selling price/);
  await callback("rp|12|inr_199|1000"); assert.equal(claims, 1);
  await callback(`ds|${operationId}|1000|complete`); assert.equal(saleAmount, 1000);
  role = "owner";
  await message("/menu"); assert.match(JSON.stringify(messages.at(-1)), /Free trial/);
  assert.deepEqual(menuRows().map(row => row.length), [2, 2, 2, 2]);
  await message("/manage_admins"); assert.match(JSON.stringify(messages.at(-1)), /adm\|100\|open/);
  assert.match(JSON.stringify(messages.at(-1)), /own\|pending/);
  const compensationExports = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync("lib/admin-compensation.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module: compensationExports, exports: compensationExports.exports, require: (name: string) => dependencies[name] ?? {}, Date,
  });
  const compensation = compensationExports.exports as { getAdminCommissionDzd: (id: string) => Promise<number> };
  assert.equal(await compensation.getAdminCommissionDzd("100"), 0);
  role = "admin";
  assert.equal(await compensation.getAdminCommissionDzd("100"), 100);
  const snap = products.find(p => p.slug === "snapchat-plus")!;
  const legacy = { ...snap, priceOptions: [...snap.priceOptions!, { id: "legacy3", label: "3 months", labelAr: "3 أشهر", duration: "3 months", durationAr: "3 أشهر", price: 1600 }, { id: "legacy6", label: "6 months", labelAr: "6 أشهر", duration: "6 months", durationAr: "6 أشهر", price: 2000 }] };
  assert.equal(getProductOffers(legacy).some(o => o.id === "legacy3" || o.id === "legacy6"), false);
  assert.deepEqual(getProductOffers(legacy).map(o => o.duration), ["1 month", "12 months"]);
  assert.equal(telegramCallbackDataSchema.safeParse(["rp", 12, "inr_199", "-1"]).success, false);
  console.log("Bot menus, trial permissions, removed plans, price-first discount flow, and actual sale amount passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
