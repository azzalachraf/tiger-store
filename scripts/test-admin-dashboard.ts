import assert from "node:assert/strict";
import {
  csvCell,
  toCsv,
  toExcel,
  localDay,
  periodStart,
  filterOrders,
  orderCells,
  orderHeaders,
} from "../components/admin/data-tools";
import {
  parseProductOptions,
  parseProductExtra,
} from "../components/admin/product-form-data";
import { adminOrderSchema } from "../lib/validation";
import { reportRange } from "../components/admin/reporting";
import { financeTotals } from "../components/admin/FinanceLedger";
import {
  financialLedger,
  financialSeries,
} from "../components/admin/financial-result";
import { tigerSheetCells } from "../components/admin/TigerNewSheetCopy";
assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
for (const value of ["=1+1", "+21355", "@SUM(1)", "-cmd", '  =HYPERLINK("x")'])
  assert.ok(csvCell(value).startsWith("\"'"));
assert.equal(csvCell(2300), "2300");
assert.ok(toCsv(["Client"], [["أشرف"]]).startsWith("\uFEFF"));
const xml = toExcel(["Phone", "Price"], [["0555000000", 2300]]);
assert.ok(xml.includes('ss:Type="String">0555000000'));
assert.ok(xml.includes('ss:Type="Number">2300'));
assert.ok(toExcel(["text"], [['<>&"']]).includes("&lt;&gt;&amp;&quot;"));
assert.equal(localDay("2026-08-31T23:30:00Z"), "2026-09-01");
assert.equal(periodStart("7", new Date("2026-09-01T12:00:00Z")), "2026-08-26");
assert.equal(
  periodStart("month", new Date("2026-09-01T12:00:00Z")),
  "2026-09-01",
);
const order = adminOrderSchema.parse({
  id: "TEST-1",
  customerName: "عميل اختبار",
  phone: "0555000000",
  email: "fixture@example.test",
  total: 2300,
  status: "delivered",
  paymentMethod: "Binance",
  createdAt: "2026-08-31T23:30:00Z",
  products: [],
});
assert.equal(
  filterOrders(
    [order],
    "عميل",
    "delivered",
    "2026-09-01",
    "2026-09-01",
    "Binance",
  ).length,
  1,
);
assert.equal(filterOrders([order], "", "pending", "", "").length, 0);
assert.equal(filterOrders([order], "", "all", "", "2026-08-31").length, 0);
assert.equal(orderHeaders.length, orderCells(order).length);
const option = {
  id: "plan",
  label: "Month",
  labelAr: "شهر",
  duration: "1 month",
  durationAr: "شهر",
  price: 600,
  available: false,
  compatibilityEn: "iPhone",
  compatibilityAr: "آيفون",
};
assert.deepEqual(parseProductOptions(JSON.stringify([option])), [option]);
assert.throws(() => parseProductOptions(JSON.stringify([option, option])));
assert.throws(() => parseProductOptions("{invalid"));
assert.throws(() =>
  parseProductOptions(JSON.stringify([{ ...option, price: 0.5 }])),
);
assert.equal(parseProductExtra("null", "details"), undefined);
assert.throws(() => parseProductExtra('{"warrantyEn":"Test"}', "details"));
assert.throws(() => parseProductExtra('[{"questionEn":"Question"}]', "faqs"));
console.log(
  "Admin dashboard regression checks passed (CSV/Excel, injection safety, timezone/filtering, product plans and validation).",
);
const now = new Date("2026-09-09T12:00:00Z");
assert.equal(
  reportRange({ range: "custom", start: "2026-02-30", end: "2026-09-09" }, now)
    .invalid,
  true,
);
assert.equal(
  reportRange({ range: "custom", start: "2026-09-10", end: "2026-09-11" }, now)
    .invalid,
  true,
);
assert.equal(
  reportRange({ range: "custom", start: "2026-08-01", end: "2026-08-31" }, now)
    .start,
  "2026-08-01",
);
assert.equal(reportRange({ range: "7" }, now).start, "2026-09-03");
const finance = financeTotals(
  [
    {
      id: "fixture",
      adminId: "1",
      admin: "Test",
      plan: 1,
      date: "2026-09-08T23:30:00Z",
      revenue: 600,
      cost: 135,
      credit: 100,
    },
  ],
  [{ date: "2026-09-09", amount: 100, platform: "instagram" }],
);
assert.equal(finance.profit - finance.ads, 265);
assert.deepEqual(finance.missing, []);
assert.equal(
  financeTotals(
    [
      {
        id: "f",
        adminId: "1",
        admin: "Test",
        plan: 1,
        date: "2026-09-09T12:00:00Z",
        revenue: 600,
        cost: 135,
        credit: 0,
      },
    ],
    [],
  ).profit,
  465,
);
const sheet = tigerSheetCells({
  orderId: "fixture",
  orderStatus: "completed",
  copied: false,
  missingDetails: false,
  client: "Test",
  subscription: "Snapchat",
  duration: "12 months",
  costPrice: "135",
  amountPaid: "2380",
  spend: "must be blank",
  cost: "must be blank",
  netProfit: "2145",
  paymentMethod: "Flexy",
  admin: "Test",
});
assert.equal(sheet.length, 10);
assert.equal(sheet[5], "");
assert.equal(sheet[6], "");
assert.equal(sheet[8], "Flexy");
console.log(
  "Report calendar validation, salary/commission profit and sheet column checks passed.",
);
const netSales = [
  {
    id: "net-test",
    adminId: "salary",
    admin: "Test",
    plan: 12,
    date: "2026-09-08T23:30:00Z",
    revenue: 2300,
    cost: 535,
    credit: 0,
  },
];
const netAds = [
  { date: "2026-09-09", amount: 100, platform: "instagram" },
  { date: "2026-09-10", amount: 50, platform: "instagram" },
];
const series = financialSeries(netSales, netAds);
assert.deepEqual(series, [
  { date: "2026-09-09", revenue: 2300, net: 1665 },
  { date: "2026-09-10", revenue: 0, net: -50 },
]);
assert.equal(
  series.reduce((sum, row) => sum + row.net, 0),
  1615,
);
assert.equal(financialSeries(netSales, netAds, false)[0].net, 1765);
assert.equal(
  financialSeries([{ ...netSales[0], credit: 100 }], netAds)[0].net,
  1565,
);
const mapped = financialLedger([], {
  sales: [
    {
      order_id: "telegram",
      card_type: "inr_199",
      card_cost_usd_cents: 214,
      gross_profit_dzd: 1765,
      admin_telegram_user_id: "salary",
      plan_months: 12,
      completed_at: "2026-09-09T10:00:00Z",
      revenue_dzd: 2300,
      card_cost_dzd: 535,
      commission_dzd: 0,
    },
  ],
  admins: [],
  advertisingSpend: [],
});
assert.equal(mapped.sales[0].credit, 0);
assert.equal(financialSeries(mapped.sales, mapped.spend)[0].net, 1765);
const saleReport = {
  sales: [
    {
      order_id: order.id,
      card_type: "inr_199",
      card_cost_usd_cents: 214,
      gross_profit_dzd: 1765,
      admin_telegram_user_id: "salary",
      plan_months: 12,
      completed_at: order.createdAt,
      revenue_dzd: 2300,
      card_cost_dzd: 535,
      commission_dzd: 0,
    },
  ],
  admins: [],
  advertisingSpend: [],
};
assert.equal(financialLedger([order], saleReport).sales.length, 1);
assert.equal(
  financialLedger([{ ...order, status: "cancelled" }], saleReport).sales.length,
  0,
);
assert.equal(
  financialLedger([{ ...order, status: "refunded" }], saleReport).sales.length,
  0,
);
assert.equal(
  financialLedger([{ ...order, status: "pending" }], {
    ...saleReport,
    sales: [],
  }).sales.length,
  0,
);
assert.equal(
  financialLedger([order], { ...saleReport, sales: [] }).sales[0].adminId,
  "website",
);
console.log(
  "Net-profit series: recorded costs, salary credit, advertising-only days, timezone and revenue isolation passed.",
);
