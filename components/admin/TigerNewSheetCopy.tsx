"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { tigerNewSheetHeaders, type TigerNewSheetData, type TigerNewSheetRow, type TigerNewSheetScope } from "@/lib/tiger-new-sheet-types";

function cleanCell(value: string) { return value.replace(/[\t\r\n]+/g, " ").trim(); }
function rowCells(row: TigerNewSheetRow) { return [row.client, row.subscription, row.duration, row.costPrice, row.amountPaid, row.spend, row.cost, row.netProfit, row.paymentMethod, row.admin].map(cleanCell); }

export function TigerNewSheetCopy({ initialData }: { initialData: TigerNewSheetData }) {
  const [data, setData] = useState(initialData);
  const [state, setState] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const [activeScope, setActiveScope] = useState<TigerNewSheetScope | null>(null);

  async function copyRows(scope: TigerNewSheetScope) {
    const rows = scope === "completed" ? data.completedRows : data.incompleteRows;
    if (!rows.length || state === "copying") return;
    setState("copying"); setActiveScope(scope);
    try {
      await navigator.clipboard.writeText(rows.map((row) => rowCells(row).join("\t")).join("\n"));
      const response = await fetch("/api/admin/tiger-new-sheet/copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, orderIds: rows.map((row) => row.orderId) }) });
      if (!response.ok) throw new Error("Copy state failed");
      const result: unknown = await response.json();
      const copiedOrderIds = result && typeof result === "object" && "copiedOrderIds" in result && Array.isArray(result.copiedOrderIds) ? new Set(result.copiedOrderIds.filter((value): value is string => typeof value === "string")) : new Set<string>();
      setData((current) => scope === "completed" ? { ...current, completedRows: current.completedRows.filter((row) => !copiedOrderIds.has(row.orderId)) } : { ...current, incompleteRows: current.incompleteRows.filter((row) => !copiedOrderIds.has(row.orderId)) });
      setState("copied"); window.setTimeout(() => setState("idle"), 2200);
    } catch { setState("error"); }
  }

  const groups: { scope: TigerNewSheetScope; title: string; note: string; rows: TigerNewSheetRow[] }[] = [
    { scope: "completed", title: "Completed orders", note: "Customer warranty details and payment method are confirmed.", rows: data.completedRows },
    { scope: "incomplete", title: "Incomplete orders", note: "Warranty links issued but customer details are still missing.", rows: data.incompleteRows },
  ];

  return <section className="rounded-md border border-tiger-ember/25 bg-white/[0.045] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.2)]">
    <div><h2 className="text-lg font-black text-white">Tiger New Sheet</h2><p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-white/55">Copy each group as spreadsheet-ready rows. Spend and Cost stay empty so your formulas and manual values remain in the right columns.</p></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3"><Stat label="All warranty orders" value={data.totals.all}/><Stat label="Completed" value={data.totals.completed}/><Stat label="Incomplete" value={data.totals.incomplete}/></div>
    <div className="mt-6 grid gap-6">{groups.map((group) => <section key={group.scope} className="rounded-xl border border-white/10 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-black text-white">{group.title}</h3><p className="mt-1 text-sm font-semibold text-white/55">{group.note}</p></div><button type="button" disabled={!group.rows.length || state === "copying"} onClick={() => copyRows(group.scope)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-tiger-ember px-4 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50">{state === "copied" && activeScope === group.scope ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{state === "copying" && activeScope === group.scope ? "Copying…" : state === "copied" && activeScope === group.scope ? "Copied" : `Copy new rows (${group.rows.length})`}</button></div><RowsTable rows={group.rows}/>{!group.rows.length ? <p className="mt-4 text-sm font-semibold text-white/55">No new rows are waiting to be copied.</p> : null}</section>)}</div>
    {state === "error" ? <p className="mt-4 text-sm font-bold text-red-300">Clipboard data is still available, but the copied state could not be saved. Try again before pasting.</p> : null}
  </section>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"><p className="text-xs font-bold text-white/50">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></div>; }
function RowsTable({ rows }: { rows: TigerNewSheetRow[] }) { return <div className="mt-4 overflow-x-auto rounded-xl border border-white/10"><table className="min-w-max text-left text-xs"><thead className="bg-black/35 text-white/65"><tr>{tigerNewSheetHeaders.map((header) => <th key={header} className="whitespace-nowrap px-3 py-3 font-black">{header}</th>)}</tr></thead><tbody>{rows.slice(0, 12).map((row) => <tr key={row.orderId} className="border-t border-white/8 text-white/80">{rowCells(row).map((value, index) => <td key={`${row.orderId}-${tigerNewSheetHeaders[index]}`} className="whitespace-nowrap px-3 py-3">{value || <span className="text-white/25">—</span>}</td>)}</tr>)}</tbody></table>{rows.length > 12 ? <p className="px-3 py-3 text-xs font-semibold text-white/40">Previewing 12 of {rows.length} rows. Copy includes all new rows.</p> : null}</div>; }
