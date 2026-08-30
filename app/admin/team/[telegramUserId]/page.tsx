import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Mail, Phone, UserRound } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminClientSheet, getAdminFinanceSummary } from "@/lib/finance";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { telegramUserIdSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin client sheet" };

type TeamAdmin = { telegram_user_id: string | number; first_name: string | null; username: string | null; role: "admin" | "owner" };

function money(value: number) {
  return `${new Intl.NumberFormat("en-US").format(value)} DZD`;
}

function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Algiers", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export default async function AdminClientSheetPage({ params }: { params: Promise<{ telegramUserId: string }> }) {
  const { telegramUserId: rawAdminId } = await params;
  const parsedAdminId = telegramUserIdSchema.safeParse(rawAdminId);
  if (!parsedAdminId.success) notFound();
  const adminId = parsedAdminId.data;

  const { data, error } = await getSupabaseServiceClient()
    .from("telegram_users")
    .select("telegram_user_id, first_name, username, role")
    .eq("telegram_user_id", adminId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Administrator could not be loaded.");
  if (!data) notFound();
  const admin = data as TeamAdmin;
  const [summary, rows] = await Promise.all([getAdminFinanceSummary(adminId), getAdminClientSheet(adminId)]);
  const name = admin.first_name || admin.username || `Admin ${adminId}`;

  return <AdminShell title={`📋 ${name}'s client sheet`} description="Private internal record of this administrator's completed Telegram sales. Customer details stay in the secure admin panel.">
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
        <div className="flex min-w-0 items-center gap-3"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tiger-ember/15 text-tiger-gold"><UserRound className="h-5 w-5" /></span><div><p className="font-black text-white">{name}</p><p className="text-sm text-white/50">{admin.username ? `@${admin.username}` : "No Telegram username"}</p></div></div>
        <Link href="/admin/team" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-black text-white hover:bg-white/10"><ArrowLeft className="h-4 w-4" /> Back to team</Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Completed orders" value={String(summary.completedOrders)} />
        <Metric label="Commission" value={money(summary.commissionDzd)} />
        <Metric label="Paid" value={money(summary.paidDzd)} />
        <Metric label="Adjustments" value={money(summary.adjustmentsDzd)} />
        <Metric label="Remaining balance" value={money(summary.remainingDzd)} accent />
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
        <div className="flex items-center gap-2 border-b border-white/10 p-4"><ClipboardList className="h-5 w-5 text-tiger-gold" /><div><h2 className="font-black text-white">Clients and completed orders</h2><p className="mt-1 text-sm text-white/55">Only completed sales assigned to this administrator appear here.</p></div></div>
        {rows.length ? <>
          <div className="grid gap-3 p-3 md:hidden">
            {rows.map((row) => <article key={row.orderId} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black text-white">{row.customerName}</p><p className="mt-1 text-xs font-semibold text-white/45">{row.productName} · {row.planMonths} month{row.planMonths === 1 ? "" : "s"}</p></div><span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-1 text-xs font-black text-emerald-300">{row.status}</span></div>
              <div className="mt-3 grid gap-2 text-sm text-white/65"><p className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-tiger-gold" /><span dir="ltr">{row.phone}</span></p><p className="flex min-w-0 gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-tiger-gold" /><span className="truncate" dir="ltr">{row.email}</span></p></div>
              <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-sm"><span className="text-white/50">{dateTime(row.completedAt)}</span><span className="font-black text-tiger-gold">{money(row.revenueDzd)}</span></div>
            </article>)}
          </div>
          <div className="hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead className="bg-black/25 text-xs uppercase tracking-wide text-white/50"><tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Product / plan</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3 text-right">Sale</th><th className="px-4 py-3 text-right">Commission</th></tr></thead><tbody>{rows.map((row) => <tr key={row.orderId} className="border-t border-white/10 text-white/80"><td className="px-4 py-4 font-bold text-white">{row.customerName}<p className="mt-1 text-xs font-medium text-white/40">{row.orderId}</p></td><td className="px-4 py-4">{row.productName}<p className="mt-1 text-xs text-white/45">{row.planMonths} month{row.planMonths === 1 ? "" : "s"}</p></td><td className="px-4 py-4" dir="ltr">{row.phone}</td><td className="max-w-52 truncate px-4 py-4" dir="ltr">{row.email}</td><td className="px-4 py-4 whitespace-nowrap">{dateTime(row.completedAt)}</td><td className="px-4 py-4 text-right font-black text-tiger-gold">{money(row.revenueDzd)}</td><td className="px-4 py-4 text-right font-black">{money(row.commissionDzd)}</td></tr>)}</tbody></table></div>
        </> : <p className="p-8 text-center text-sm font-semibold text-white/55">No completed Telegram sales are assigned to this administrator yet.</p>}
      </section>
    </div>
  </AdminShell>;
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <article className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><p className="text-xs font-bold uppercase tracking-wide text-white/45">{label}</p><p className={`mt-2 text-xl font-black ${accent ? "text-tiger-gold" : "text-white"}`}>{value}</p></article>;
}
