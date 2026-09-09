"use client";
import { useState } from "react";
import type { LedgerSale, LedgerSpend } from "./FinanceLedger";
import { financialSeries } from "./financial-result";
import { localDay } from "./data-tools";
import { RevenueLineChart, MonthlyRevenueBarChart } from "./DashboardCharts";

export function FinancialResult({
  sales,
  spend,
  charts = false,
  monthly = false,
  deductAds = true,
}: {
  sales: LedgerSale[];
  spend: LedgerSpend[];
  charts?: boolean;
  monthly?: boolean;
  deductAds?: boolean;
}) {
  const [metric, setMetric] = useState<"net" | "revenue">("net");
  const label =
    metric === "revenue"
      ? "Revenue"
      : deductAds
        ? "Net profit"
        : "Profit before advertising";
  const series = financialSeries(sales, spend, deductAds);
  const value = series.reduce((sum, row) => sum + row[metric], 0);
  const daily = series.map((row) => ({ date: row.date, revenue: row[metric] }));
  const months = new Map<string, number>();
  for (const row of daily)
    months.set(
      row.date.slice(0, 7),
      (months.get(row.date.slice(0, 7)) ?? 0) + row.revenue,
    );
  const missing = new Set(
    sales
      .filter((sale) => !spend.some((ad) => ad.date === localDay(sale.date)))
      .map((sale) => localDay(sale.date)),
  );
  return (
    <section className="admin-panel mb-5" aria-label="Financial result">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div aria-live="polite">
          <p className="admin-muted">{label}</p>
          <strong className="text-3xl" data-testid="financial-value">
            {value.toLocaleString("en-US")} DA
          </strong>
        </div>
        <label className="grid gap-1 text-sm">
          Show
          <select
            aria-label="Financial metric"
            value={metric}
            onChange={(event) =>
              setMetric(event.target.value as "net" | "revenue")
            }
          >
            <option value="net">Net profit</option>
            <option value="revenue">Revenue</option>
          </select>
        </label>
      </div>
      <p className="admin-muted mt-3">
        {metric === "revenue"
          ? "Revenue from completed sales, before costs and admin credit."
          : deductAds
            ? "Completed sales minus recorded card costs, admin credit and advertising."
            : "Filtered sales minus card costs and admin credit. Business-wide advertising is not allocated to this filter."}
      </p>
      {metric === "net" && (
        <>
          {sales.some((sale) => sale.adminId === "website") && (
            <p className="admin-muted mt-2">
              Website costs not recorded are not estimated; profit is
              provisional.
            </p>
          )}
          {missing.size > 0 && (
            <p className="admin-feedback" data-error="true">
              Advertising missing on {missing.size} sales day(s). Profit is
              provisional.
            </p>
          )}
        </>
      )}
      {charts && (
        <div className={monthly ? "mt-5 grid gap-4 lg:grid-cols-2" : "mt-5"}>
          {daily.length ? (
            <RevenueLineChart data={daily} label={label} />
          ) : (
            <p className="admin-empty">No financial activity in this period.</p>
          )}
          {monthly && daily.length > 0 && (
            <MonthlyRevenueBarChart
              data={[...months].map(([month, revenue]) => ({ month, revenue }))}
              label={label}
            />
          )}
        </div>
      )}
    </section>
  );
}
