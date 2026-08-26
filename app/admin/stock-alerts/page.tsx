import { AdminShell } from "@/components/admin/AdminShell";
import { getSupabaseServiceClient } from "@/lib/supabase";

type StockAlertRow = { id: string; phone: string; status: string; created_at: string; product_id: string };

export default async function StockAlertsPage() {
  const { data } = await getSupabaseServiceClient().from("stock_alerts").select("id, phone, status, created_at, product_id").order("created_at", { ascending: false });
  const alerts = (data ?? []) as StockAlertRow[];
  return <AdminShell title="Stock alerts" description="Private availability requests from customers."><div className="grid gap-3">{alerts.map((alert) => <article key={alert.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="font-black">{alert.product_id}</p><p className="phone-ltr mt-1 text-sm text-white/70">{alert.phone}</p><p className="mt-1 text-xs text-white/50">{alert.status} · {alert.created_at}</p></article>)}{!alerts.length ? <p className="rounded-xl border border-white/10 p-4 text-sm text-white/60">No stock alerts.</p> : null}</div></AdminShell>;
}
