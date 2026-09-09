import { AdminShell } from "@/components/admin/AdminShell";
import { TigerNewSheetCopy } from "@/components/admin/TigerNewSheetCopy";
import { getTigerNewSheetData } from "@/lib/tiger-new-sheet";
import { readAdminOrders } from "@/app/admin/read-orders";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tiger New Sheet" };

export default async function TigerNewSheetPage() {
  const orders = await readAdminOrders();
  const data = await getTigerNewSheetData(orders);
  return (
    <AdminShell
      title="Tiger New Sheet"
      description="Filter, select, copy and export orders without losing your copy history."
    >
      <TigerNewSheetCopy
        initialData={data}
        dates={Object.fromEntries(orders.map((o) => [o.id, o.createdAt]))}
      />
    </AdminShell>
  );
}
