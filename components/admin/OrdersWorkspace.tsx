"use client";
import { PrivateReceipt } from "./PrivateReceipt";
import { useState } from "react";
import type { AdminOrder, AdminOrderStatus } from "@/lib/types";
import {
  saveOrderStatusAction,
  deleteOrderAction,
  createWarrantyLinkAction,
} from "@/app/admin/orders/actions";
import { ActionForm } from "./ActionForm";
import { ExportControls, Pagination, StatusBadge } from "./TableControls";
import { filterOrders, localDay, orderCells, orderHeaders } from "./data-tools";
const statuses: AdminOrderStatus[] = [
  "pending",
  "paid",
  "delivered",
  "cancelled",
  "refunded",
];
const payments = [
  "BaridiMob",
  "Binance",
  "RedotPay",
  "Flexy",
  "Telegram",
  "External",
  "CCP",
];
export function OrdersWorkspace({
  orders,
  initialQuery = "",
}: {
  orders: AdminOrder[];
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("paid");
  const filtered = filterOrders(orders, q, status, start, end, payment).sort(
    (a, b) =>
      sort === "amount"
        ? b.total - a.total
        : sort === "oldest"
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
  );
  const current = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / size)),
  );
  const shown = filtered.slice((current - 1) * size, current * size);
  const chosen = filtered.filter((o) => selected.includes(o.id));
  function reset() {
    setPage(1);
    setSelected([]);
  }
  async function bulk() {
    for (const order of chosen) {
      const form = new FormData();
      form.set("id", order.id);
      form.set("status", bulkStatus);
      form.set("paymentMethod", order.paymentMethod);
      form.set("adminNotes", order.adminNotes ?? "");
      await saveOrderStatusAction(form);
    }
    setSelected([]);
  }
  return (
    <>
      <div className="admin-toolbar">
        <label className="admin-search">
          Search orders
          <input
            type="search"
            value={q}
            placeholder="Client, order, phone, email or product"
            onChange={(e) => {
              setQ(e.target.value);
              reset();
            }}
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              reset();
            }}
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Payment
          <select
            value={payment}
            onChange={(e) => {
              setPayment(e.target.value);
              reset();
            }}
          >
            <option value="all">All methods</option>
            {payments.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-toolbar">
        <label>
          From
          <input
            type="date"
            value={start}
            max={end || undefined}
            onChange={(e) => {
              setStart(e.target.value);
              reset();
            }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={end}
            min={start || undefined}
            onChange={(e) => {
              setEnd(e.target.value);
              reset();
            }}
          />
        </label>
        <label>
          Sort
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              reset();
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount">Highest amount</option>
          </select>
        </label>
        <ExportControls
          name="tiger-orders"
          headers={orderHeaders}
          rows={(chosen.length ? chosen : filtered).map(orderCells)}
        />
      </div>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="checkbox"
          aria-label="Select orders on current page"
          checked={
            shown.length > 0 && shown.every((o) => selected.includes(o.id))
          }
          onChange={(e) =>
            setSelected(
              e.target.checked
                ? Array.from(new Set([...selected, ...shown.map((o) => o.id)]))
                : selected.filter((id) => !shown.some((o) => o.id === id)),
            )
          }
        />
        <span className="admin-muted">
          Select page · {chosen.length} selected · exports include{" "}
          {chosen.length || filtered.length} orders
        </span>
      </div>
      {chosen.length > 0 && (
        <ActionForm
          action={bulk}
          confirmation={
            "Change the status of " +
            chosen.length +
            " selected orders to " +
            bulkStatus +
            "? If a request fails, earlier changes may already be saved. Review orders before retrying."
          }
          className="admin-panel mb-4 flex flex-wrap items-center gap-3"
        >
          <span>{chosen.length} selected</span>
          <select
            aria-label="Bulk status"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
          >
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button className="admin-btn admin-btn-primary">
            Update selected
          </button>
          <button
            type="button"
            className="admin-btn"
            onClick={() => setSelected([])}
          >
            Clear selection
          </button>
        </ActionForm>
      )}
      <div className="grid gap-3">
        {shown.map((order) => (
          <div key={order.id} className="flex gap-2 items-start">
            <input
              type="checkbox"
              className="mt-5"
              aria-label={"Select order " + order.id}
              checked={selected.includes(order.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, order.id]
                    : selected.filter((id) => id !== order.id),
                )
              }
            />
            <details className="admin-order-card min-w-0 flex-1">
              <summary className="admin-order-summary">
                <div>
                  <strong dir="auto">
                    {order.customerName || "Manual order"}
                  </strong>
                  <p className="admin-muted break-all">{order.id}</p>
                  <div className="admin-order-meta">
                    <span>
                      {localDay(order.createdAt)}{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        timeZone: "Africa/Algiers",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(order.createdAt))}
                    </span>
                    <span>{order.paymentMethod}</span>
                    <span>
                      {order.products
                        .map((p) => p.name + " · " + p.option)
                        .join(" + ") || "Manual sale"}
                    </span>
                  </div>
                </div>
                <div className="text-end">
                  <strong className="block mb-2">
                    {order.total.toLocaleString("en-US")} DA
                  </strong>
                  <StatusBadge status={order.status} />
                  <p className="admin-muted mt-2">Manage ↓</p>
                </div>
              </summary>
              <div className="admin-order-details">
                <dl className="grid gap-3 sm:grid-cols-2 mb-5">
                  {[
                    ["Phone", order.phone],
                    ["Email", order.email],
                    ["Customer notes", order.notes],
                    [
                      "Products",
                      order.products
                        .map(
                          (p) => p.name + " / " + p.option + " ×" + p.quantity,
                        )
                        .join("\n"),
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="admin-muted">{label}</dt>
                      <dd
                        className="whitespace-pre-wrap break-words"
                        dir="auto"
                      >
                        {value || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
                {order.receiptPath && <PrivateReceipt orderId={order.id} />}
                <ActionForm
                  action={saveOrderStatusAction}
                  key={
                    order.status +
                    order.paymentMethod +
                    (order.adminNotes ?? "")
                  }
                  className="grid gap-4"
                >
                  <input type="hidden" name="id" value={order.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      Status
                      <select name="status" defaultValue={order.status}>
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      Client payment method
                      <select
                        name="paymentMethod"
                        defaultValue={order.paymentMethod}
                      >
                        {payments.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="grid gap-2">
                    Admin notes
                    <textarea
                      name="adminNotes"
                      rows={2}
                      maxLength={2000}
                      defaultValue={order.adminNotes ?? ""}
                    />
                  </label>
                  <button className="admin-btn admin-btn-primary justify-self-start">
                    Save order
                  </button>
                </ActionForm>
                {order.status === "delivered" &&
                  order.products.map((item, index) => (
                    <ActionForm
                      key={item.id}
                      action={createWarrantyLinkAction}
                      className="mt-5 admin-panel"
                    >
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="itemIndex" value={index} />
                      <p className="font-bold mb-3">
                        Warranty · {item.name} / {item.option}
                      </p>
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="grid gap-1 text-xs">
                          Coverage days
                          <input
                            name="coveredDays"
                            type="number"
                            min={1}
                            max={3650}
                            required
                            defaultValue={365}
                          />
                        </label>
                        <button className="admin-btn">
                          Create warranty link
                        </button>
                      </div>
                    </ActionForm>
                  ))}
                <ActionForm
                  action={deleteOrderAction}
                  className="mt-5 border-t border-white/10 pt-5"
                  confirmation={
                    "Permanently delete order " +
                    order.id +
                    " and its linked records? This cannot be undone."
                  }
                >
                  <input type="hidden" name="id" value={order.id} />
                  <button className="admin-btn admin-btn-danger">
                    Permanently delete order
                  </button>
                </ActionForm>
              </div>
            </details>
          </div>
        ))}
      </div>
      {!shown.length && (
        <div className="admin-empty">
          <h2>No orders match these filters</h2>
          <button
            className="admin-btn"
            onClick={() => {
              setQ("");
              setStatus("all");
              setPayment("all");
              setStart("");
              setEnd("");
              reset();
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <Pagination
        page={current}
        count={filtered.length}
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
