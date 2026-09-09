"use client";
import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, Clock3, Wallet, Package } from "lucide-react";
import type { AdminOrder } from "@/lib/types";
import { RevenueLineChart } from "./DashboardCharts";
import {
  filterOrders,
  localDay,
  periodStart,
  orderCells,
  orderHeaders,
} from "./data-tools";
import { ExportControls, StatusBadge } from "./TableControls";
export function Overview({
  orders,
  availableProducts,
}: {
  orders: AdminOrder[];
  availableProducts: number;
}) {
  const [period, setPeriod] = useState("month");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const from = period === "custom" ? start : periodStart(period);
  const to = period === "custom" ? end : localDay(new Date());
  const filtered = filterOrders(orders, "", "all", from, to);
  const paid = filtered.filter(
    (o) => o.status === "paid" || o.status === "delivered",
  );
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const byDay = new Map<string, number>();
  paid.forEach((o) => {
    const d = localDay(o.createdAt);
    byDay.set(d, (byDay.get(d) ?? 0) + o.total);
  });
  const chart = Array.from(byDay, ([date, revenue]) => ({
    date,
    revenue,
  })).sort((a, b) => a.date.localeCompare(b.date));
  const money = (value: number) => value.toLocaleString("en-US") + " DA";
  return (
    <>
      <div className="admin-toolbar">
        <label>
          Reporting period
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="month">This month</option>
            <option value="all">All time</option>
            <option value="custom">Custom dates</option>
          </select>
        </label>
        {period === "custom" && (
          <>
            <label>
              From
              <input
                type="date"
                value={start}
                max={end || undefined}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </>
        )}
        <ExportControls
          name="tiger-overview-orders"
          headers={orderHeaders}
          rows={filtered.map(orderCells)}
        />
      </div>
      <div className="admin-metrics">
        {[
          ["Collected revenue", money(revenue), Wallet],
          ["Orders", filtered.length, ShoppingBag],
          [
            "Awaiting review",
            filtered.filter((o) => o.status === "pending").length,
            Clock3,
          ],
          ["Available products", availableProducts, Package],
        ].map(([label, value, Icon]) => {
          const MetricIcon = Icon as typeof Wallet;
          return (
            <div className="admin-metric" key={String(label)}>
              <p className="admin-metric-label">
                <MetricIcon size={16} />
                {String(label)}
              </p>
              <strong>{String(value)}</strong>
            </div>
          );
        })}
      </div>
      <div className="admin-chart-grid">
        <section className="admin-panel">
          <p className="admin-muted mb-3">
            Revenue includes paid and delivered orders. Cancelled and refunded
            orders are excluded.
          </p>
          {chart.length ? (
            <RevenueLineChart data={chart} />
          ) : (
            <div className="admin-empty">
              No collected revenue in this period.
            </div>
          )}
        </section>
        <section className="admin-panel">
          <h2 className="admin-panel-title">Order pipeline</h2>
          <p className="admin-muted mb-6">
            {filtered.length} orders in this period
          </p>
          {["pending", "paid", "delivered", "cancelled", "refunded"].map(
            (status) => {
              const count = filtered.filter((o) => o.status === status).length;
              return (
                <div className="mb-5" key={status}>
                  <div className="mb-2 flex justify-between">
                    <StatusBadge status={status} />
                    <b>{count}</b>
                  </div>
                  <div className="admin-microbar">
                    <span
                      style={{
                        width:
                          (filtered.length
                            ? (count / filtered.length) * 100
                            : 0) + "%",
                      }}
                    />
                  </div>
                </div>
              );
            },
          )}
        </section>
      </div>
      <section className="admin-panel">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="admin-panel-title">Recent orders</h2>
          <Link href="/admin/orders" className="admin-btn">
            Manage orders
          </Link>
        </div>
        {filtered.slice(0, 6).map((order) => (
          <Link
            className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-4"
            key={order.id}
            href={"/admin/orders?q=" + encodeURIComponent(order.id)}
          >
            <div>
              <b dir="auto">{order.customerName}</b>
              <p className="admin-muted">
                {localDay(order.createdAt)} · {order.paymentMethod}
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <b>{money(order.total)}</b>
              <StatusBadge status={order.status} />
            </div>
          </Link>
        ))}
        {!filtered.length && (
          <p className="admin-empty">No orders match this period.</p>
        )}
      </section>
    </>
  );
}
