"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export type GoogleSheetsOrderRow = {
  client: string;
  phone: string;
  email: string;
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

const headers = ["Client", "Phone", "Email", "Order Code", "Subscription", "Duration", "Quantity", "Cost Price", "Amount Paid", "Spend", "Cost", "Net Profit", "Payment Method", "Status", "Order Date", "Notes"];

function cleanCell(value: string) { return value.replace(/[\t\r\n]+/g, " ").trim(); }

function toTsv(rows: GoogleSheetsOrderRow[]) {
  return [headers, ...rows.map((row) => [row.client, row.phone, row.email, row.orderCode, row.subscription, row.duration, row.quantity, row.costPrice, row.amountPaid, row.spend, row.cost, row.netProfit, row.paymentMethod, row.status, row.orderDate, row.notes].map(cleanCell))]
    .map((row) => row.join("\t"))
    .join("\n");
}

export function GoogleSheetsOrderCopy({ rows }: { rows: GoogleSheetsOrderRow[] }) {
  const [copied, setCopied] = useState<"completed" | "all" | null>(null);
  const completedRows = rows.filter((row) => row.completed);

  async function copyRows(scope: "completed" | "all") {
    const selected = scope === "completed" ? completedRows : rows;
    if (!selected.length) return;
    await navigator.clipboard.writeText(toTsv(selected));
    setCopied(scope);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <section className="mb-6 rounded-md border border-tiger-ember/25 bg-white/[0.045] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.2)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Google Sheets copy table</h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-white/55">Copy completed orders as spreadsheet-ready columns. Spend, Cost, and Net Profit are deliberately blank so your existing Google Sheet can keep its own manual values or formulas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!completedRows.length} onClick={() => copyRows("completed")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-tiger-ember px-4 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50">
            {copied === "completed" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === "completed" ? "Copied" : `Copy completed (${completedRows.length})`}
          </button>
          <button type="button" disabled={!rows.length} onClick={() => copyRows("all")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
            {copied === "all" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === "all" ? "Copied" : `Copy all (${rows.length})`}
          </button>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-max text-left text-xs">
          <thead className="bg-black/35 text-white/65"><tr>{headers.map((header) => <th key={header} className="whitespace-nowrap px-3 py-3 font-black">{header}</th>)}</tr></thead>
          <tbody>{rows.slice(0, 8).map((row) => <tr key={row.orderCode} className="border-t border-white/8 text-white/80">{[row.client, row.phone, row.email, row.orderCode, row.subscription, row.duration, row.quantity, row.costPrice, row.amountPaid, row.spend, row.cost, row.netProfit, row.paymentMethod, row.status, row.orderDate, row.notes].map((value, index) => <td key={`${row.orderCode}-${headers[index]}`} className="whitespace-nowrap px-3 py-3">{value || <span className="text-white/25">—</span>}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {rows.length > 8 ? <p className="mt-3 text-xs font-semibold text-white/40">Previewing 8 of {rows.length} orders. Copy includes every selected row.</p> : null}
    </section>
  );
}
