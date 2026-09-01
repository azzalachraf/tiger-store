"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Search } from "lucide-react";
import { tigerNewSheetHeaders, type TigerNewSheetData, type TigerNewSheetRow } from "@/lib/tiger-new-sheet-types";

type Filter = "all" | "completed" | "pending" | "cancelled" | "missing" | "uncopied" | "copied";

function cleanCell(value: string) { return value.replace(/[\t\r\n]+/g, " ").trim(); }
function rowCells(row: TigerNewSheetRow) { return [row.client, row.subscription, row.duration, row.costPrice, row.amountPaid, row.spend, row.cost, row.netProfit, row.paymentMethod, row.admin].map(cleanCell); }

export function TigerNewSheetCopy({ initialData }: { initialData: TigerNewSheetData }) {
  const [rows, setRows] = useState(initialData.rows);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesFilter = filter === "all" || filter === row.orderStatus || (filter === "missing" && row.missingDetails) || (filter === "copied" && row.copied) || (filter === "uncopied" && !row.copied);
    const term = query.trim().toLocaleLowerCase();
    return matchesFilter && (!term || `${row.client} ${row.subscription} ${row.orderId} ${row.admin}`.toLocaleLowerCase().includes(term));
  }), [filter, query, rows]);
  const uncopiedRows = filteredRows.filter((row) => !row.copied);

  async function copyRows() {
    if (!uncopiedRows.length || state === "copying") return;
    setState("copying");
    try {
      await navigator.clipboard.writeText(uncopiedRows.map((row) => rowCells(row).join("\t")).join("\n"));
      const response = await fetch("/api/admin/tiger-new-sheet/copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds: uncopiedRows.map((row) => row.orderId) }) });
      if (!response.ok) throw new Error("Copy state failed");
      const result: unknown = await response.json();
      const copiedIds = result && typeof result === "object" && "copiedOrderIds" in result && Array.isArray(result.copiedOrderIds) ? new Set(result.copiedOrderIds.filter((value): value is string => typeof value === "string")) : new Set<string>();
      setRows((current) => current.map((row) => copiedIds.has(row.orderId) ? { ...row, copied: true } : row));
      setState("copied"); window.setTimeout(() => setState("idle"), 2200);
    } catch { setState("error"); }
  }

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: rows.length },
    { value: "completed", label: "Completed", count: rows.filter((row) => row.orderStatus === "completed").length },
    { value: "pending", label: "Pending", count: rows.filter((row) => row.orderStatus === "pending").length },
    { value: "cancelled", label: "Cancelled / refunded", count: rows.filter((row) => row.orderStatus === "cancelled").length },
    { value: "missing", label: "Missing details", count: rows.filter((row) => row.missingDetails).length },
    { value: "uncopied", label: "Not copied", count: rows.filter((row) => !row.copied).length },
    { value: "copied", label: "Copied", count: rows.filter((row) => row.copied).length },
  ];

  return <section className="rounded-md border border-tiger-ember/25 bg-white/[0.045] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.2)] sm:p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-lg font-black text-white">Tiger New Sheet</h2><p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-white/55">Copied rows stay visible. The button copies only uncopied rows in the current filter. Spend and Cost remain empty.</p></div><button type="button" disabled={!uncopiedRows.length || state === "copying"} onClick={copyRows} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-tiger-ember px-4 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-50">{state === "copied" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{state === "copying" ? "Copying…" : state === "copied" ? "Copied" : `Copy uncopied rows (${uncopiedRows.length})`}</button></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3"><Stat label="Total orders" value={rows.length}/><Stat label="Completed" value={filters[1].count}/><Stat label="Pending" value={filters[2].count}/></div>
    <div className="mt-5 flex flex-wrap gap-2">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`min-h-10 rounded-full border px-3 text-xs font-black ${filter === item.value ? "border-tiger-ember bg-tiger-ember text-black" : "border-white/15 text-white/70 hover:border-white/30"}`}>{item.label} · {item.count}</button>)}</div>
    <label className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-white/60"><Search className="h-4 w-4"/><span className="sr-only">Search orders</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client, product, order or admin" className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/35"/></label>
    <RowsTable rows={filteredRows}/>
    {!filteredRows.length ? <p className="mt-4 text-sm font-semibold text-white/55">No orders match this filter.</p> : null}
    {state === "error" ? <p className="mt-4 text-sm font-bold text-red-300">The rows were copied to your clipboard, but their saved copy status failed. Try again before pasting.</p> : null}
  </section>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"><p className="text-xs font-bold text-white/50">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></div>; }
function RowsTable({ rows }: { rows: TigerNewSheetRow[] }) { return <div className="mt-4 overflow-x-auto rounded-xl border border-white/10"><table className="min-w-max text-left text-xs"><thead className="bg-black/35 text-white/65"><tr><th className="px-3 py-3 font-black">Status</th><th className="px-3 py-3 font-black">Copy</th>{tigerNewSheetHeaders.map((header) => <th key={header} className="whitespace-nowrap px-3 py-3 font-black">{header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.orderId} className="border-t border-white/8 text-white/80"><td className="whitespace-nowrap px-3 py-3 font-bold capitalize">{row.orderStatus}</td><td className="whitespace-nowrap px-3 py-3"><span className={`rounded-full px-2 py-1 font-black ${row.copied ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"}`}>{row.copied ? "Copied" : "New"}</span></td>{rowCells(row).map((value, index) => <td key={`${row.orderId}-${tigerNewSheetHeaders[index]}`} className="whitespace-nowrap px-3 py-3">{value || <span className="text-white/25">—</span>}</td>)}</tr>)}</tbody></table></div>; }
