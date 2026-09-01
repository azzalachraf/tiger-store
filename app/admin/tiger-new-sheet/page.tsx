import { AdminShell } from "@/components/admin/AdminShell";
import { TigerNewSheetCopy } from "@/components/admin/TigerNewSheetCopy";
import { getTigerNewSheetData } from "@/lib/tiger-new-sheet";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tiger New Sheet" };

export default async function TigerNewSheetPage() {
  const data = await getTigerNewSheetData();
  return <AdminShell title="Tiger New Sheet" description="Copy new completed and incomplete warranty orders separately into your existing Google Sheet."><TigerNewSheetCopy initialData={data} /></AdminShell>;
}
