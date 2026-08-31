import { AdminShell } from "@/components/admin/AdminShell";
import { TigerNewSheetCopy } from "@/components/admin/TigerNewSheetCopy";
import { getTigerNewSheetRows } from "@/lib/tiger-new-sheet";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tiger New Sheet" };

export default async function TigerNewSheetPage() {
  const rows = await getTigerNewSheetRows();
  return <AdminShell title="Tiger New Sheet" description="Copy only new warranty-linked orders into your existing Google Sheet."><TigerNewSheetCopy initialRows={rows} /></AdminShell>;
}
