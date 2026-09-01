import { AdminShell } from "@/components/admin/AdminShell";
import { TigerNewSheetCopy } from "@/components/admin/TigerNewSheetCopy";
import { getTigerNewSheetData } from "@/lib/tiger-new-sheet";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tiger New Sheet" };

export default async function TigerNewSheetPage() {
  const data = await getTigerNewSheetData();
  return <AdminShell title="Tiger New Sheet" description="View every order, filter the list, and copy only rows that have not been exported before."><TigerNewSheetCopy initialData={data} /></AdminShell>;
}
