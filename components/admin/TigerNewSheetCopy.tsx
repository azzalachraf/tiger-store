"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { tigerNewSheetHeaders, type TigerNewSheetRow } from "@/lib/tiger-new-sheet-types";

function cleanCell(value: string) { return value.replace(/[\t\r\n]+/g, " ").trim(); }
function rowCells(row: TigerNewSheetRow) {
  return [row.client, row.subscription, row.duration, row.costPrice, row.amountPaid, row.spend, row.cost, row.netProfit, row.paymentMethod, row.admin].map(cleanCell);
}

export function TigerNewSheetCopy({ initialRows }: { initialRows: TigerNewSheetRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [state, setState] = useState<"idle" | "copying" | "copied" | "error">("idle");

  async function copyNewRows() {
    if (!rows.length || state === "copying") return;
    setState("copying");
    try {
      await navigator.clipboard.writeText(rows.map((row) => rowCells(row).join("\t")).join("\n"));
      const response = await fetch("/api/admin/tiger-new-sheet/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: rows.map((row) => row.orderId) }),
      });
      if (!response.ok) throw new Error("Copy state failed");
      const result: unknown = await response.json();
      const copiedOrderIds = result && typeof result === "object" && "copiedOrderIds" in result && Array.isArray(result.copiedOrderIds)
        ? new Set(result.copiedOrderIds.filter((value): value is string => typeof value === "string"))
        : new Set<string>();
      setRows((current) => current.filter((row) => !copiedOrderIds.has(row.orderId)));
      setState("copied");
      window.setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
    }
  }

  return (
    <section className="rounded-md border border-tiger-ember/25 bg-white/[0.045] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.2)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Tiger New Sheet</h2>
          <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-white/55">Only warranty-linked orders appear here. Copy sends tab-separated rows without headers, keeps Spend and Cost empty, then marks exactly those rows as copied.</p>
        </div>
        <button type="button" disabled={!rows.length || state === "copying"} onClick={copyNewRows} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-tiger-ember px-4 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50">
          {state === "copied" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {state === "copying" ? "Copying…" : state === "copied" ? "Copied — new rows only next time" : `Copy new rows (${rows.length})`}
        </button>
      </div>
      {state === "error" ? <p className="mt-3 text-sm font-bold text-red-300">Clipboard data is still available, but the copied state could not be saved. Try again before pasting.</p> : null}
      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-max text-left text-xs">
          <thead className="bg-black/35 text-white/65"><tr>{tigerNewSheetHeaders.map((header) => <th key={header} className="whitespace-nowrap px-3 py-3 font-black">{header}</th>)}</tr></thead>
          <tbody>{rows.slice(0, 12).map((row) => <tr key={row.orderId} className="border-t border-white/8 text-white/80">{rowCells(row).map((value, index) => <td key={`${row.orderId}-${tigerNewSheetHeaders[index]}`} className="whitespace-nowrap px-3 py-3">{value || <span className="text-white/25">—</span>}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {!rows.length ? <p className="mt-4 text-sm font-semibold text-white/55">No new warranty-linked orders are waiting to be copied.</p> : null}
      {rows.length > 12 ? <p className="mt-3 text-xs font-semibold text-white/40">Previewing 12 of {rows.length} rows. Copy includes all new rows.</p> : null}
    </section>
  );
}
