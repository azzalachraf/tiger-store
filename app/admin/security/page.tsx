import { Ban, KeyRound, LockKeyhole, MonitorSmartphone, ShieldCheck, UserPlus } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminSecurityOverview, isAdminSecurityUnlocked } from "@/lib/admin-security";
import {
  banAdminSessionIpAction,
  createAdminUserAction,
  lockAdminSecurityAction,
  revokeAdminSessionAction,
  setAdminUserActiveAction,
  unbanAdminIpAction,
  unlockAdminSecurityAction,
} from "./actions";

export const dynamic = "force-dynamic";

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Algiers" }).format(new Date(value));
}

export default async function AdminSecurityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const current = await requireAdmin();
  const unlocked = await isAdminSecurityUnlocked();
  const { error } = await searchParams;

  if (!unlocked) {
    return (
      <AdminShell title="Admin security" description="Enter the private security PIN to manage administrators, sessions, and IP bans.">
        <section className="admin-panel mx-auto max-w-lg p-5 sm:p-7">
          <LockKeyhole className="mb-4 h-9 w-9 text-tiger-ember" />
          <h2 className="text-xl font-black text-white">Security PIN required</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">This area locks again after 15 minutes. Five failed attempts from one IP trigger a 15-minute cooldown.</p>
          {error ? <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">Incorrect PIN or too many attempts. Try again later.</p> : null}
          <form action={unlockAdminSecurityAction} className="mt-5 grid gap-3">
            <label className="grid gap-2 text-sm font-bold text-white">PIN
              <input name="pin" type="password" inputMode="numeric" autoComplete="off" required minLength={4} maxLength={12} className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white outline-none focus:border-tiger-ember" />
            </label>
            <Button type="submit"><ShieldCheck size={17} /> Unlock security</Button>
          </form>
        </section>
      </AdminShell>
    );
  }

  const overview = await getAdminSecurityOverview(current.sessionId);
  return (
    <AdminShell title="Admin security" description="Manage dashboard administrators, active sessions, and blocked IP addresses.">
      <div className="mb-4 flex justify-end">
        <form action={lockAdminSecurityAction}><button className="admin-btn"><LockKeyhole size={16} /> Lock section</button></form>
      </div>

      <section className="admin-panel p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3"><UserPlus className="text-tiger-ember" /><div><h2 className="text-lg font-black text-white">Add administrator</h2><p className="text-sm text-white/55">New administrators can use the dashboard immediately. Passwords are stored as salted scrypt hashes.</p></div></div>
        <form action={createAdminUserAction} className="grid gap-3 md:grid-cols-3">
          <input name="displayName" required minLength={2} maxLength={80} placeholder="Display name" className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white" />
          <input name="email" required type="email" placeholder="Email" className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white" />
          <input name="password" required type="password" minLength={12} maxLength={512} autoComplete="new-password" placeholder="Temporary password (12+ characters)" className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white" />
          <Button type="submit" className="md:col-span-3 md:w-fit"><UserPlus size={17} /> Create administrator</Button>
        </form>
      </section>

      <section className="admin-panel mt-5 overflow-hidden">
        <div className="border-b border-white/10 p-5"><h2 className="flex items-center gap-2 text-lg font-black text-white"><KeyRound className="text-tiger-ember" /> Administrators</h2></div>
        <div className="divide-y divide-white/10">
          <div className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div><strong className="text-white">Owner</strong><p className="text-sm text-white/55">{current.identity.isOwner ? current.identity.email : "Configured through ADMIN_EMAIL"} · protected bootstrap account</p></div>
            <span className="w-fit rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">Active</span>
          </div>
          {overview.users.map((user) => (
            <div key={user.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div><strong className="text-white">{user.displayName}</strong><p className="text-sm text-white/55">{user.email} · added {dateTime(user.createdAt)}</p></div>
              <form action={setAdminUserActiveAction}>
                <input type="hidden" name="id" value={user.id} /><input type="hidden" name="active" value={String(!user.isActive)} />
                <button className={user.isActive ? "admin-btn border-red-500/30 text-red-200" : "admin-btn border-emerald-500/30 text-emerald-200"}>{user.isActive ? "Disable and revoke sessions" : "Enable"}</button>
              </form>
            </div>
          ))}
          {!overview.users.length ? <p className="p-5 text-sm text-white/55">No additional administrators yet.</p> : null}
        </div>
      </section>

      <section className="admin-panel mt-5 overflow-hidden">
        <div className="border-b border-white/10 p-5"><h2 className="flex items-center gap-2 text-lg font-black text-white"><MonitorSmartphone className="text-tiger-ember" /> Active sessions</h2><p className="mt-1 text-sm text-white/55">IP addresses are encrypted in the database. Revoking a session takes effect on its next request.</p></div>
        <div className="divide-y divide-white/10">
          {overview.sessions.map((session) => (
            <article key={session.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-white">{session.name}</strong>{session.isOwner ? <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs text-orange-200">Owner</span> : null}{session.isCurrent ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200">This session</span> : null}</div><p className="mt-1 text-sm text-white/65">{session.email}</p><p className="mt-1 font-mono text-sm text-white">{session.ip}</p><p className="mt-1 truncate text-xs text-white/45" title={session.userAgent}>{session.userAgent || "Unknown device"}</p><p className="mt-1 text-xs text-white/45">Last active {dateTime(session.lastSeenAt)} · expires {dateTime(session.expiresAt)}</p></div>
              <div className="flex flex-wrap gap-2">
                <form action={revokeAdminSessionAction}><input type="hidden" name="id" value={session.id} /><button className="admin-btn border-amber-500/30 text-amber-200">Kick session</button></form>
                {!session.isCurrent ? <form action={banAdminSessionIpAction} className="flex gap-2"><input type="hidden" name="id" value={session.id} /><input name="reason" maxLength={300} placeholder="Ban reason" className="min-h-10 w-36 rounded-lg border border-white/10 bg-black px-3 text-sm text-white" /><button className="admin-btn border-red-500/30 text-red-200"><Ban size={15} /> Ban IP</button></form> : null}
              </div>
            </article>
          ))}
          {!overview.sessions.length ? <p className="p-5 text-sm text-white/55">No active sessions.</p> : null}
        </div>
      </section>

      <section className="admin-panel mt-5 overflow-hidden">
        <div className="border-b border-white/10 p-5"><h2 className="flex items-center gap-2 text-lg font-black text-white"><Ban className="text-red-300" /> Banned IP addresses</h2></div>
        <div className="divide-y divide-white/10">
          {overview.bans.map((ban) => (
            <div key={ban.ipHash} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><strong className="font-mono text-white">{ban.ip}</strong><p className="text-sm text-white/55">{ban.reason || "No reason provided"} · banned {dateTime(ban.bannedAt)} by {ban.createdByEmail}</p></div><form action={unbanAdminIpAction}><input type="hidden" name="ipHash" value={ban.ipHash} /><button className="admin-btn">Unban IP</button></form></div>
          ))}
          {!overview.bans.length ? <p className="p-5 text-sm text-white/55">No IP addresses are banned.</p> : null}
        </div>
      </section>
    </AdminShell>
  );
}
