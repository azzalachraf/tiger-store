"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  tigerNewSheetHeaders,
  type TigerNewSheetData,
  type TigerNewSheetRow,
} from "@/lib/tiger-new-sheet-types";
import { ExportControls, Pagination, StatusBadge } from "./TableControls";
import { localDay } from "./data-tools";

export function tigerSheetCells(r: TigerNewSheetRow) {
  return [
    r.client,
    r.subscription,
    r.duration,
    r.costPrice,
    r.amountPaid,
    "",
    "",
    r.netProfit,
    r.paymentMethod,
    r.admin,
  ];
}
function tsv(rows: TigerNewSheetRow[]) {
  return rows
    .map((r) =>
      tigerSheetCells(r)
        .map((v) => {
          const text = v.replace(/[\t\r\n]+/g, " ").trim();
          return /^[=+@-]/.test(text) ? "'" + text : text;
        })
        .join("\t"),
    )
    .join("\n");
}
export function TigerNewSheetCopy({
  initialData,
  dates = {},
}: {
  initialData: TigerNewSheetData;
  dates?: Record<string, string>;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [copiedIds, setCopiedIds] = useState<string[]>([]);
  const rows = useMemo(
    () =>
      initialData.rows.map((r) =>
        copiedIds.includes(r.orderId) ? { ...r, copied: true } : r,
      ),
    [initialData, copiedIds],
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [copy, setCopy] = useState("all");
  const [admin, setAdmin] = useState("all");
  const [payment, setPayment] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const filtered = rows.filter(
    (r) =>
      (r.client + " " + r.subscription + " " + r.orderId + " " + r.admin)
        .toLowerCase()
        .includes(query.toLowerCase().trim()) &&
      (status === "all" ||
        (status === "missing" ? r.missingDetails : r.orderStatus === status)) &&
      (copy === "all" || (copy === "copied" ? r.copied : !r.copied)) &&
      (admin === "all" || r.admin === admin) &&
      (payment === "all" || r.paymentMethod === payment) &&
      (!start || (dates[r.orderId] && localDay(dates[r.orderId]) >= start)) &&
      (!end || (dates[r.orderId] && localDay(dates[r.orderId]) <= end)),
  );
  const current = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / size)),
  );
  const shown = filtered.slice((current - 1) * size, current * size);
  const chosen = filtered.filter((r) => selected.includes(r.orderId));
  const target = chosen.length ? chosen : filtered;
  const fresh = target.filter((r) => !r.copied).slice(0, 1000);
  function reset() {
    setPage(1);
    setSelected([]);
  }
  async function copyRows(recopy = false) {
    if (busy) return;
    const batch = recopy ? target : fresh;
    if (!batch.length) return;
    setBusy(true);
    setError(false);
    let clipboardDone = false;
    try {
      await navigator.clipboard.writeText(tsv(batch));
      clipboardDone = true;
      if (!recopy) {
        const response = await fetch("/api/admin/tiger-new-sheet/copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderIds: batch.map((r) => r.orderId) }),
        });
        if (!response.ok) throw new Error("Status failed");
        const result: unknown = await response.json();
        if (
          !result ||
          typeof result !== "object" ||
          !("copiedOrderIds" in result) ||
          !Array.isArray(result.copiedOrderIds)
        )
          throw new Error("Invalid response");
        const ids = result.copiedOrderIds.filter(
          (id): id is string =>
            typeof id === "string" && batch.some((r) => r.orderId === id),
        );
        setCopiedIds((current) => [...new Set([...current, ...ids])]);
        if (ids.length !== batch.length) throw new Error("Partial status");
      }
      setMessage(batch.length + " rows copied. Rows remain in the table.");
    } catch {
      setError(true);
      setMessage(
        clipboardDone
          ? "Clipboard copied, but saved status could not be confirmed for every row. Refresh and review before another copy."
          : "Clipboard access failed. Allow clipboard permission and try again; copy history is unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-metrics">
        {[
          ["All orders", rows.length],
          [
            "Completed",
            rows.filter((r) => r.orderStatus === "completed").length,
          ],
          ["New to copy", rows.filter((r) => !r.copied).length],
          ["Missing details", rows.filter((r) => r.missingDetails).length],
        ].map(([l, v]) => (
          <div className="admin-metric" key={l}>
            <p className="admin-muted">{l}</p>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="admin-toolbar">
        <label className="admin-search">
          Search sheet
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              reset();
            }}
            placeholder="Client, product, order or admin"
          />
        </label>
        <label>
          Order status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              reset();
            }}
          >
            {[
              ["all", "All orders"],
              ["completed", "Completed"],
              ["pending", "Pending"],
              ["cancelled", "Cancelled / refunded"],
              ["missing", "Missing details"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Copy status
          <select
            value={copy}
            onChange={(e) => {
              setCopy(e.target.value);
              reset();
            }}
          >
            <option value="all">All rows</option>
            <option value="new">Not copied</option>
            <option value="copied">Copied</option>
          </select>
        </label>
      </div>
      <details className="admin-panel mb-4">
        <summary>More filters: admin, payment & dates</summary>
        <div className="admin-toolbar mt-4 mb-0">
          <label>
            Admin
            <select
              value={admin}
              onChange={(e) => {
                setAdmin(e.target.value);
                reset();
              }}
            >
              <option value="all">All admins</option>
              {[...new Set(rows.map((r) => r.admin))].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Payment method
            <select
              value={payment}
              onChange={(e) => {
                setPayment(e.target.value);
                reset();
              }}
            >
              <option value="all">All methods</option>
              {[...new Set(rows.map((r) => r.paymentMethod))].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
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
        </div>
      </details>
      <div className="admin-panel mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            className="admin-btn admin-btn-primary"
            disabled={!fresh.length || busy}
            onClick={() => copyRows()}
          >
            Copy new rows ({fresh.length})
          </button>
          <button
            className="admin-btn"
            disabled={!target.length || busy}
            onClick={() => copyRows(true)}
          >
            Copy again (no status change)
          </button>
          <ExportControls
            name="tiger-new-sheet"
            headers={[...tigerNewSheetHeaders]}
            rows={target.map(tigerSheetCells)}
          />
          <button
            className="admin-btn"
            disabled={refreshing || busy}
            onClick={() => startRefresh(() => router.refresh())}
          >
            {refreshing ? "Refreshing…" : "Refresh orders"}
          </button>
        </div>
        <p className="admin-muted mt-3">
          {chosen.length
            ? chosen.length + " selected"
            : filtered.length + " filtered"}{" "}
          · Copies include all filtered rows, not just this page. New-copy
          batches are limited to 1,000. Spend and Cost stay empty. File exports
          do not mark rows copied.
        </p>
        {message && (
          <p
            className="admin-feedback"
            data-error={error}
            role={error ? "alert" : "status"}
          >
            {message}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-3 items-center mb-3">
        <label className="flex gap-2 items-center">
          <input
            type="checkbox"
            checked={
              shown.length > 0 &&
              shown.every((r) => selected.includes(r.orderId))
            }
            onChange={(e) =>
              setSelected(
                e.target.checked
                  ? [...new Set([...selected, ...shown.map((r) => r.orderId)])]
                  : selected.filter(
                      (id) => !shown.some((r) => r.orderId === id),
                    ),
              )
            }
          />
          Select this page
        </label>
        <button className="admin-btn" onClick={() => setSelected([])}>
          Clear selection
        </button>
        <button
          className="admin-btn"
          onClick={() => {
            setQuery("");
            setStatus("all");
            setCopy("all");
            setAdmin("all");
            setPayment("all");
            setStart("");
            setEnd("");
            reset();
          }}
        >
          Reset filters
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table min-w-max text-xs">
          <thead>
            <tr>
              <th>Select</th>
              <th>Order / status</th>
              <th>Copy</th>
              {tigerNewSheetHeaders.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.orderId}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={"Select " + r.orderId}
                    checked={selected.includes(r.orderId)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, r.orderId]
                          : selected.filter((id) => id !== r.orderId),
                      )
                    }
                  />
                </td>
                <td>
                  <a href={"/admin/orders?q=" + encodeURIComponent(r.orderId)}>
                    {r.orderId}
                  </a>
                  <p>
                    <StatusBadge status={r.orderStatus} />
                  </p>
                  {r.missingDetails && (
                    <p className="admin-muted">Details incomplete</p>
                  )}
                </td>
                <td>{r.copied ? "Copied" : "New"}</td>
                {tigerSheetCells(r).map((v, i) => (
                  <td key={i}>{v || "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!shown.length && (
        <p className="admin-empty">No orders match these filters.</p>
      )}
      <Pagination
        count={filtered.length}
        page={current}
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
