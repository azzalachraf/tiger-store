// Exercises real server actions with isolated in-memory services. Never loads env files.
import { build } from "esbuild";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const state = {
  authorized: false,
  calls: [],
  products: [],
  order: null,
  rows: [],
  ranges: [],
  error: null,
  activeCount: 0,
  predicates: [],
};
globalThis.__adminTest = state;
const record = `const s=globalThis.__adminTest;const record=name=>async(...args)=>{s.calls.push({name,args});};`;
const mocks = {
  "server-only": "",
  "next/cache": "export function revalidatePath(){}",
  "next/navigation": `export function redirect(url){throw new Error('REDIRECT:'+url);}`,
  "@/lib/admin-auth": `export async function requireAdmin(){if(!globalThis.__adminTest.authorized)throw new Error('DENIED');}export const requireAdminAction=requireAdmin;`,
  "@/lib/env": `export const getServerEnv=()=>({TELEGRAM_OWNER_ID:"999"});`,
  "@/lib/categories": `export const getSiteCategories=()=>[];`,
  "@/lib/admin-store":
    record +
    `export const getReceiptSignedUrl=async path=>'https://example.test/receipt';export const getProducts=async()=>s.products;export const getOrderById=async()=>s.order;export const getProductBySlug=async slug=>s.products.find(p=>p.slug===slug);export const deleteOrder=async id=>{s.calls.push({name:'deleteOrder',args:[id]});return {deleted:true};};` +
    [
      "saveProduct",
      "deleteProduct",
      "saveOrder",
      "saveAccount",
      "deleteAccount",
      "saveAccounts",
      "saveSettings",
    ]
      .map((n) => `export const ${n}=record('${n}');`)
      .join(""),
  "@/lib/finance":
    record +
    `export const getAdminFinanceSummary=async()=>({remainingDzd:1000});export const getFinanceSettings=async()=>({usdDzdRate:250});export const saveFinanceSettings=record('saveFinanceSettings');`,
  "@/lib/marketing-store":
    record + `export const getMarketingConfig=async()=>({meta_capi_token:'fixture-existing-token'});export const saveMarketingConfig=record('saveMarketingConfig');`,
  "@/lib/snapchat-operations":
    record +
    [
      "markAvailableRedeemCardUsed",
      "removeAvailableRedeemCard",
      "restoreManuallyUsedRedeemCard",
      "uploadRedeemCardsFromTelegram",
    ]
      .map((n) => `export const ${n}=record('${n}');`)
      .join(""),
  "@/lib/snapchat-cards": `export const snapchatCardTypes=['try_24','try_48','inr_100','try_115','try_229','inr_199','inr_298'];`,
  "@/lib/telegram-card-upload": `export const parseTelegramRedeemCardLines=(type,text)=>text.split(String.fromCharCode(10));`,
  "@/lib/order-warranty":
    record +
    `export const issueOrderWarrantyLink=async input=>{s.calls.push({name:'warranty',args:[input]});return 'fixture-token';};`,
  "@/lib/product-checkout-link":
    record +
    `export const createProductCheckoutLink=async input=>{s.calls.push({name:'checkout',args:[input]});return 'fixture-token';};`,
  "@/lib/supabase": `const s=globalThis.__adminTest;export function getSupabaseServiceClient(){return {async rpc(name,args){s.calls.push({name,args:[args]});return {error:args.p_amount>1000?{message:'overrun'}:null};},from(table){const q={select(){return q},order(){return q},range(a,b){s.ranges.push([a,b]);return Promise.resolve({data:s.rows.slice(a,b+1),error:s.error});},insert(v){s.calls.push({name:table,args:[v]});return q;},update(v){s.calls.push({name:table,args:[v]});return q;},eq(k,v){s.predicates.push([k,v]);return q;},in(){return q;},then(resolve,reject){return Promise.resolve({data:table==="telegram_users"?[{telegram_user_id:"12345"}]:[],count:s.activeCount,error:s.error}).then(resolve,reject);}};return q;}};}`,
};
const groups = [
  "orders",
  "products",
  "accounts",
  "settings",
  "finance",
  "card-stock",
  "team",
  "marketing/meta",
];
const output = join(
  await mkdtemp(join(tmpdir(), "tiger-admin-actions-")),
  "actions.mjs",
);
await build({
  stdin: {
    contents:
      groups
        .map((p, i) => `export * as group${i} from './app/admin/${p}/actions';`)
        .join("\n") +
      `export {readAdminOrders} from './app/admin/read-orders';export {loadPrivateReceipt} from './app/admin/orders/receipt';`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  outfile: output,
  bundle: true,
  platform: "node",
  format: "esm",
  plugins: [
    {
      name: "test-services",
      setup(b) {
        b.onResolve({ filter: /.*/ }, (a) =>
          Object.hasOwn(mocks, a.path)
            ? { path: a.path, namespace: "mock" }
            : undefined,
        );
        b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
          contents: mocks[a.path],
          loader: "js",
        }));
      },
    },
  ],
});
const modules = await import(pathToFileURL(output).href);
let denied = 0;
for (const group of Object.values(modules)) {
  for (const action of typeof group === "function"
    ? [group]
    : Object.values(group)) {
    await assert.rejects(() => action(new FormData()), /DENIED/);
    denied++;
  }
}
assert.equal(state.calls.length, 0);
assert.equal(state.ranges.length, 0);
state.authorized = true;
const data = (values) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, String(v));
  return fd;
};
const orders = modules.group0;
state.order = {
  id: "test-order",
  customerName: "Synthetic",
  phone: "0555000000",
  email: "test@example.test",
  products: [],
  total: 2300,
  paymentMethod: "Binance",
  status: "pending",
  createdAt: "2026-09-01T12:00:00Z",
  notes: "preserved",
};
await orders.saveOrderStatusAction(
  data({
    id: "test-order",
    status: "delivered",
    paymentMethod: "Binance",
    adminNotes: "checked",
  }),
);
assert.equal(state.calls.at(-1).args[0].notes, "preserved");
assert.equal(state.calls.at(-1).args[0].total, 2300);
await assert.rejects(() =>
  orders.saveOrderStatusAction(data({ id: "test-order", status: "invalid" })),
);
await orders.addManualOrderAction(
  data({
    customerName: "Manual fixture",
    total: 600,
    status: "paid",
    paymentMethod: "Binance",
  }),
);
assert.equal(state.calls.at(-1).args[0].phone, "manual");
await assert.rejects(
  () => orders.deleteOrderAction(data({ id: "test-order" })),
  /REDIRECT/,
);
await assert.rejects(
  () =>
    orders.createWarrantyLinkAction(
      data({ orderId: "test-order", itemIndex: 0, coveredDays: 365 }),
    ),
  /REDIRECT/,
);
const product = {
  id: "fixture",
  slug: "fixture",
  name: "Fixture",
  nameAr: "اختبار",
  category: "social",
  categoryAr: "social",
  price: 2300,
  currency: "DZD",
  duration: "12 months",
  durationAr: "عام",
  shortDescriptionAr: "",
  shortDescriptionEn: "",
  featuresAr: [],
  featuresEn: [],
  activationTypeAr: "",
  activationTypeEn: "",
  image: "/fixture.webp",
  available: true,
  featured: false,
  priceOptions: [
    {
      id: "plan",
      label: "12 months",
      labelAr: "عام",
      duration: "12 months",
      durationAr: "عام",
      price: 2300,
      available: true,
      compatibilityAr: "آيفون",
      compatibilityEn: "iPhone",
    },
  ],
};
state.products = [product];
await assert.rejects(
  () =>
    orders.createProductCheckoutLinkAction(
      data({ slug: "fixture", optionId: "plan" }),
    ),
  /REDIRECT/,
);
const productForm = data({
  ...product,
  available: "on",
  featured: "",
  featuresAr: "",
  featuresEn: "",
  priceOptions: JSON.stringify(product.priceOptions),
  details: "null",
  faqs: "[]",
});
await assert.rejects(
  () => modules.group1.saveProductAction(productForm),
  /REDIRECT/,
);
assert.equal(
  state.calls.at(-1).args[0].priceOptions[0].compatibilityEn,
  "iPhone",
);
productForm.set("priceOptions", "invalid");
let count = state.calls.length;
await assert.rejects(() => modules.group1.saveProductAction(productForm));
assert.equal(state.calls.length, count);
await modules.group1.deleteProductAction(data({ id: "fixture" }));
const account = {
  email: "fixture@example.test",
  emailPassword: "fixture",
  chatgptPassword: "fixture",
  price: 100,
  status: "Available",
};
await modules.group2.saveAccountAction(data(account));
await modules.group2.deleteAccountAction(data({ id: "fixture" }));
await modules.group2.importAccountsAction(
  data({ accounts: JSON.stringify([account]) }),
);
await modules.group3.saveSettingsAction(
  data({
    whatsappNumber: "test",
    domainText: "example.test",
    promoHeadings: "a\nb",
  }),
);
const finance = { usdDzdRate: 250, paymentDay: 1, reportingSheetId: "" };
for (const m of [1, 2, 3, 6, 12]) {
  finance["price-" + m] = 600;
  finance["commission-" + m] = 100;
}
for (const c of [
  "try_24",
  "try_48",
  "inr_100",
  "try_115",
  "try_229",
  "inr_199",
  "inr_298",
])
  finance["cost-" + c] = 100;
await modules.group4.saveFinanceSettingsAction(data(finance));
await modules.group4.addAdminAdjustmentAction(
  data({ adminId: "12345", amountDzd: -100, reason: "Fixture adjustment" }),
);
await modules.group4.markAdminPaidAction(
  data({ adminId: "12345", amountDzd: 1000, requestKey: "00000000-0000-4000-8000-000000000001" }),
);
assert.equal(state.calls.at(-1).name, "record_admin_payment_atomic");
assert.equal(state.calls.at(-1).args[0].p_amount, 1000);
assert.equal(state.calls.at(-1).args[0].p_key, "00000000-0000-4000-8000-000000000001");
await assert.rejects(
  () =>
    modules.group4.markAdminPaidAction(
      data({ adminId: "12345", amountDzd: 1001, requestKey: "00000000-0000-4000-8000-000000000002" }),
    ),
  /could not be saved/,
);
await modules.group4.saveAdminPaymentScheduleAction(
  data({
    adminId: "12345",
    workStartedAt: "2026-09-01",
    nextPaymentDate: "2026-10-01",
  }),
);
await modules.group4.recordAdvertisingSpendAction(
  data({
    spentOn: "2026-09-01",
    platform: "instagram",
    amountDzd: 250,
    campaign: "Fixture",
  }),
);
await modules.group5.addRedeemCardsAction(
  data({ cardType: "try_24", codes: "synthetic-not-a-code" }),
);
for (const n of [
  "markRedeemCardUsedAction",
  "removeRedeemCardAction",
  "restoreRedeemCardAction",
])
  await modules.group5[n](
    data({ cardId: "00000000-0000-4000-8000-000000000001" }),
  );
await modules.group6.renameTelegramAdminAction(
  data({ telegramUserId: "12345", displayName: "Fixture admin" }),
);
await modules.group7.saveMarketingConfigAction(
  data({ meta_pixel_id: "123", meta_pixel_enabled: "on" }),
);
state.rows = Array.from({ length: 1201 }, (_, i) => ({
  ...state.order,
  id: "fixture-" + i,
}));
state.order.receiptPath = "fixture";
assert.equal(
  await modules.loadPrivateReceipt("test-order"),
  "https://example.test/receipt",
);
const read = await modules.readAdminOrders();
assert.equal(read.length, 1201);
assert.deepEqual(state.ranges, [
  [0, 499],
  [500, 999],
  [1000, 1499],
]);
state.error = { message: "private" };
await assert.rejects(() => modules.readAdminOrders(), /could not be loaded/);
await assert.rejects(
  () =>
    modules.group6.disableTelegramAdminAction(data({ telegramUserId: "999" })),
  /owner/,
);
state.activeCount = 1;
await assert.rejects(
  () =>
    modules.group6.disableTelegramAdminAction(
      data({ telegramUserId: "12345" }),
    ),
  /active operations/,
);
state.activeCount = 0;
state.error = null;
await modules.group6.disableTelegramAdminAction(
  data({ telegramUserId: "12345" }),
);
assert.equal(state.calls.at(-1).args[0].role, "pending");
assert.equal(state.calls.at(-1).args[0].approved_at, null);
assert.ok(
  state.predicates.some(([key, value]) => key === "role" && value === "admin"),
);
console.log(
  `PASS: ${denied} unauthorized action/read checks; all 23 privileged mutation handlers exercised with mock services, validation, payment overrun, product-field preservation, and 1,201-order pagination.`,
);
delete globalThis.__adminTest;
