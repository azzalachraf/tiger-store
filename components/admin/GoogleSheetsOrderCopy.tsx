"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Search } from "lucide-react";

export type GoogleSheetsOrderRow = {
  client: string;
  phone: string;
  email: string;
  username: string;
  activationPlatform: string;
  orderCode: string;
  subscription: string;
  duration: string;
  quantity: string;
  costPrice: string;
  amountPaid: string;
  spend: string;
  cost: string;
  netProfit: string;
  paymentMethod: string;
  status: string;
  orderDate: string;
  notes: string;
  completed: boolean;
};

const headers = [
  "Client",
  "Phone",
  "Email",
  "Username",
  "Activation Platform",
  "Order Code",
  "Subscription",
  "Duration",
  "Quantity",
  "Cost Price",
  "Amount Paid",
  "Spend",
  "Cost",
  "Net Profit",
  "Payment Method",
  "Status",
  "Order Date",
  "Notes",
];

function cleanCell(value: string) {
  const text = value.replace(/[\t\r\n]+/g, " ").trim();
  return /^[=+@-]/.test(text) ? "'" + text : text;
}

function toTsv(rows: GoogleSheetsOrderRow[]) {
  return [
    headers,
    ...rows.map((row) =>
      [
        row.client,
        row.phone,
        row.email,
        row.username,
        row.activationPlatform,
        row.orderCode,
        row.subscription,
        row.duration,
        row.quantity,
        row.costPrice,
        row.amountPaid,
        row.spend,
        row.cost,
        row.netProfit,
        row.paymentMethod,
        row.status,
        row.orderDate,
        row.notes,
      ].map(cleanCell),
    ),
  ]
    .map((row) => row.join("\t"))
    .join("\n");
}

export function GoogleSheetsOrderCopy({
  rows,
}: {
  rows: GoogleSheetsOrderRow[];
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "completed" | "pending" | "cancelled"
  >("all");
  const [query, setQuery] = useState("");
  const completedRows = rows.filter((row) => row.completed);
  const pendingRows = rows.filter((row) => row.status === "pending");
  const cancelledRows = rows.filter(
    (row) => row.status === "cancelled" || row.status === "refunded",
  );
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesFilter =
          filter === "all" ||
          (filter === "completed" && row.completed) ||
          (filter === "pending" && row.status === "pending") ||
          (filter === "cancelled" &&
            (row.status === "cancelled" || row.status === "refunded"));
        const term = query.trim().toLocaleLowerCase();
        return (
          matchesFilter &&
          (!term ||
            `${row.client} ${row.phone} ${row.email} ${row.orderCode} ${row.subscription}`
              .toLocaleLowerCase()
              .includes(term))
        );
      }),
    [filter, query, rows],
  );

  async function copyRows() {
    if (!filteredRows.length) return;
    try {
      await navigator.clipboard.writeText(toTsv(filteredRows));
      setCopyError(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <section className="mb-6 rounded-md border border-tiger-ember/25 bg-white/[0.045] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.2)]">
      {copyError && (
        <p role="alert" className="admin-feedback" data-error="true">
          Clipboard access was blocked. Allow clipboard access in your browser,
          then retry. Your orders have not changed.
        </p>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">
            Google Sheets copy table
          </h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-white/55">
            Filter and view every client, then copy the visible rows. Copying
            never removes orders from this table.
          </p>
        </div>
        <button
          type="button"
          disabled={!filteredRows.length}
          onClick={copyRows}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-tiger-ember px-4 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied" : `Copy visible (${filteredRows.length})`}
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { value: "all" as const, label: "All", count: rows.length },
          {
            value: "completed" as const,
            label: "Completed",
            count: completedRows.length,
          },
          {
            value: "pending" as const,
            label: "Pending",
            count: pendingRows.length,
          },
          {
            value: "cancelled" as const,
            label: "Cancelled / refunded",
            count: cancelledRows.length,
          },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`min-h-10 rounded-full border px-3 text-xs font-black ${filter === item.value ? "border-tiger-ember bg-tiger-ember text-black" : "border-white/15 text-white/70"}`}
          >
            {item.label} · {item.count}
          </button>
        ))}
      </div>
      <label className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-white/60">
        <Search className="h-4 w-4" />
        <span className="sr-only">Search orders</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search client, phone, email, order or product"
          className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/35"
        />
      </label>
      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-max text-left text-xs">
          <thead className="bg-black/35 text-white/65">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap px-3 py-3 font-black"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr
                key={row.orderCode}
                className="border-t border-white/8 text-white/80"
              >
                {[
                  row.client,
                  row.phone,
                  row.email,
                  row.username,
                  row.activationPlatform,
                  row.orderCode,
                  row.subscription,
                  row.duration,
                  row.quantity,
                  row.costPrice,
                  row.amountPaid,
                  row.spend,
                  row.cost,
                  row.netProfit,
                  row.paymentMethod,
                  row.status,
                  row.orderDate,
                  row.notes,
                ].map((value, index) => (
                  <td
                    key={`${row.orderCode}-${headers[index]}`}
                    className="whitespace-nowrap px-3 py-3"
                  >
                    {value || <span className="text-white/25">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filteredRows.length ? (
        <p className="mt-3 text-xs font-semibold text-white/50">
          No clients match this filter.
        </p>
      ) : null}
    </section>
  );
}
