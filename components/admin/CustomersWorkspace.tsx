"use client";
import { useState } from "react";
import type { CustomerProfile } from "@/lib/types";
import { ExportControls, Pagination } from "./TableControls";
import { localDay } from "./data-tools";
export function CustomersWorkspace({
  customers,
}: {
  customers: CustomerProfile[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("spent");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const rows = customers
    .filter((c) =>
      (c.name + " " + c.email)
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "orders"
        ? b.orderCount - a.orderCount
        : sort === "recent"
          ? b.lastOrder.localeCompare(a.lastOrder)
          : b.totalSpent - a.totalSpent,
    );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  return (
    <>
      <div className="admin-toolbar">
        <label className="admin-search">
          Search customers
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Name or email"
          />
        </label>
        <label>
          Sort
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="spent">Highest spending</option>
            <option value="orders">Most orders</option>
            <option value="recent">Most recent</option>
          </select>
        </label>
        <ExportControls
          name="tiger-customers"
          headers={[
            "Name",
            "Email",
            "Orders",
            "Total spent (DA)",
            "First order",
            "Last order",
          ]}
          rows={rows.map((c) => [
            c.name,
            c.email,
            c.orderCount,
            c.totalSpent,
            c.firstOrder,
            c.lastOrder,
          ])}
        />
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table admin-table-responsive">
          <thead>
            <tr>
              {["Customer", "Orders", "Total spent", "Last order"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice((current - 1) * size, current * size).map((c, i) => (
              <tr key={c.email + i}>
                <td>
                  <strong dir="auto">{c.name || "—"}</strong>
                  <p className="admin-muted break-all">{c.email}</p>
                </td>
                <td data-label="Orders">{c.orderCount}</td>
                <td data-label="Total spent">
                  {c.totalSpent.toLocaleString("en-US")} DA
                </td>
                <td data-label="Last order">{localDay(c.lastOrder)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="admin-empty">No customers match this search.</p>
      )}
      <Pagination
        page={current}
        count={rows.length}
        size={size}
        onPage={setPage}
        onSize={(n) => {
          setSize(n);
          setPage(1);
        }}
      />
    </>
  );
}
