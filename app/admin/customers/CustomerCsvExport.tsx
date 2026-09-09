"use client";
import type { CustomerProfile } from "@/lib/types";
import { ExportControls } from "@/components/admin/TableControls";
export function CustomerCsvExport({
  customers,
}: {
  customers: CustomerProfile[];
}) {
  return (
    <ExportControls
      name="tiger-customers"
      headers={[
        "Name",
        "Email",
        "Orders",
        "Total spent (DA)",
        "Average order (DA)",
        "First order",
        "Last order",
        "Returning",
      ]}
      rows={customers.map((c) => [
        c.name,
        c.email,
        c.orderCount,
        c.totalSpent,
        c.averageOrderValue,
        c.firstOrder,
        c.lastOrder,
        c.isReturning,
      ])}
    />
  );
}
