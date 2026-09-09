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
