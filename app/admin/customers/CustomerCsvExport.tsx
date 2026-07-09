"use client";

import { Download } from "lucide-react";
import type { CustomerProfile } from "@/lib/types";

export function CustomerCsvExport({
  customers,
}: {
  customers: CustomerProfile[];
}) {
  function buildCsv() {
    const header = "Name,Email,Orders,Total Spent,Avg Order Value,First Order,Last Order,Returning";
    const rows = customers.map(
      (c) =>
        `"${c.name}","${c.email}",${c.orderCount},${c.totalSpent},${c.averageOrderValue},"${c.firstOrder}","${c.lastOrder}",${c.isReturning}`
    );
    return header + "\n" + rows.join("\n");
  }

  function handleExport() {
    const csv = buildCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-xl border border-tiger-ember/20 bg-tiger-ember/15 px-4 py-2.5 text-sm font-bold text-tiger-ember transition-colors hover:bg-tiger-ember/25"
    >
      <Download className="h-4 w-4" />
      Export Customers CSV
    </button>
  );
}
