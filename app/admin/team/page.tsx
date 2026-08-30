import Link from "next/link";
import { ClipboardList, UserRound } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { renameTelegramAdminAction } from "@/app/admin/team/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Team" };

type TeamMember = { telegram_user_id: string | number; first_name: string | null; username: string | null; role: "admin" | "owner"; created_at: string };

export default async function AdminTeamPage() {
  const { data, error } = await getSupabaseServiceClient()
    .from("telegram_users")
    .select("telegram_user_id, first_name, username, role, created_at")
    .in("role", ["admin", "owner"])
    .order("created_at", { ascending: true });
  if (error) throw new Error("Team members could not be loaded.");
  const members = (data ?? []) as TeamMember[];

  return <AdminShell title="👥 Team" description="Give each Telegram administrator a clear display name. Their Telegram identity and permissions remain unchanged.">
    <section className="grid gap-3">
      {members.map((member) => <article key={String(member.telegram_user_id)} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tiger-ember/15 text-tiger-gold"><UserRound className="h-5 w-5" /></span>
          <div className="min-w-0"><p className="truncate font-black text-white">{member.first_name || "Unnamed admin"}</p><p className="mt-1 truncate text-xs font-semibold text-white/45">{member.username ? `@${member.username}` : "No Telegram username"} · {member.role === "owner" ? "👑 Owner" : "🛡️ Admin"}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:w-[460px] sm:justify-end">
          {member.role === "admin" ? <Link href={`/admin/team/${encodeURIComponent(String(member.telegram_user_id))}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-tiger-ember/40 px-3 text-sm font-black text-tiger-gold hover:bg-tiger-ember/10"><ClipboardList className="h-4 w-4" /> Client sheet</Link> : null}
          <form action={renameTelegramAdminAction} className="flex min-w-0 flex-1 gap-2 sm:max-w-[300px]">
            <input type="hidden" name="telegramUserId" value={String(member.telegram_user_id)} />
            <label className="sr-only" htmlFor={`name-${member.telegram_user_id}`}>Display name</label>
            <input id={`name-${member.telegram_user_id}`} name="displayName" defaultValue={member.first_name ?? ""} required maxLength={80} className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-3 font-bold text-white outline-none focus:border-tiger-ember" />
            <button type="submit" className="min-h-11 shrink-0 rounded-xl bg-tiger-ember px-4 text-sm font-black text-black">Save</button>
          </form>
        </div>
      </article>)}
      {!members.length ? <p className="rounded-2xl border border-white/10 bg-white/[0.045] p-6 text-sm font-semibold text-white/60">No approved Telegram admins yet.</p> : null}
    </section>
  </AdminShell>;
}
