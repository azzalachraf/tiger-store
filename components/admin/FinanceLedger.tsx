"use client";
import { useState } from "react";
import { Pagination, ExportControls } from "./TableControls";
import { localDay } from "./data-tools";
import { FinancialResult } from "./FinancialResult";
export type LedgerSale = {
  id: string;
  adminId: string;
  admin: string;
  plan: number;
  date: string;
  revenue: number;
  cost: number;
  credit: number;
};
export type LedgerSpend = { date: string; amount: number; platform: string };
export function financeTotals(sales: LedgerSale[], spend: LedgerSpend[]) {
  const sum = (key: "revenue" | "cost" | "credit") =>
    sales.reduce((s, r) => s + r[key], 0);
  return {
    revenue: sum("revenue"),
    cost: sum("cost"),
    credit: sum("credit"),
    profit: sum("revenue") - sum("cost") - sum("credit"),
    ads: spend.reduce((s, r) => s + r.amount, 0),
    missing: [...new Set(sales.map((s) => localDay(s.date)))].filter(
      (day) => !spend.some((s) => s.date === day),
    ),
  };
}
export function FinanceLedger({
  sales,
  spend,
}: {
  sales: LedgerSale[];
  spend: LedgerSpend[];
}) {
  const [admin, setAdmin] = useState("all");
  const [plan, setPlan] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const rows = sales.filter(
    (s) =>
      (admin === "all" || s.adminId === admin) &&
      (plan === "all" || String(s.plan) === plan),
  );
  const totals = financeTotals(rows, spend);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  const all = admin === "all" && plan === "all";
  const money = (n: number) => n.toLocaleString("en-US") + " DA";
  return (
    <>
      <div className="admin-toolbar">
        <label>
          Sales by admin
          <select
            value={admin}
            onChange={(e) => {
              setAdmin(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All admins & website</option>
            {[...new Map(sales.map((s) => [s.adminId, s.admin])).entries()].map(
              ([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Subscription
          <select
            value={plan}
            onChange={(e) => {
              setPlan(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All plans</option>
            {[...new Set(sales.map((s) => s.plan))]
              .sort((a, b) => a - b)
              .map((p) => (
                <option key={p} value={p}>
                  {p ? p + " months" : "Website / other"}
                </option>
              ))}
          </select>
        </label>
        <ExportControls
          name="tiger-finance-sales"
          headers={[
            "Order",
            "Date",
            "Admin",
            "Months",
            "Revenue DA",
            "Card cost DA",
            "Credit DA",
            "Profit before ads DA",
          ]}
          rows={rows.map((s) => [
            s.id,
            localDay(s.date),
            s.admin,
            s.plan,
            s.revenue,
            s.cost,
            s.credit,
            s.revenue - s.cost - s.credit,
          ])}
        />
      </div>
      <FinancialResult sales={rows} spend={spend} deductAds={all} />
      <div className="admin-metrics">
        {[
          ["Completed orders", rows.length],
          ["Recorded advertising", money(totals.ads)],
          ["Card costs", money(totals.cost)],
          ["Admin credit", money(totals.credit)],
        ].map(([l, v]) => (
          <div key={l} className="admin-metric">
            <p className="admin-muted">{l}</p>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table admin-table-responsive">
          <thead>
            <tr>
              {[
                "Order / date",
                "Admin / plan",
                "Revenue",
                "Cost / credit",
                "Profit before ads",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice((current - 1) * size, current * size).map((s) => (
              <tr key={s.id}>
                <td>
                  <a
                    href={"/admin/orders?q=" + encodeURIComponent(s.id)}
                    className="break-all"
                  >
                    {s.id}
                  </a>
                  <p className="admin-muted">{localDay(s.date)}</p>
                </td>
                <td data-label="Admin / plan">
                  {s.admin}
                  <p className="admin-muted">
                    {s.plan ? s.plan + " months" : "Website / other"}
                  </p>
                </td>
                <td data-label="Revenue">{money(s.revenue)}</td>
                <td data-label="Cost / credit">
                  {money(s.cost)} / {money(s.credit)}
                </td>
                <td data-label="Profit before ads">
                  {money(s.revenue - s.cost - s.credit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="admin-empty">
          No completed sales match this period and filter.
        </p>
      )}
      <Pagination
        count={rows.length}
        size={size}
        page={current}
        onPage={setPage}
        onSize={(n) => {
          setSize(n);
          setPage(1);
        }}
      />
    </>
  );
}
