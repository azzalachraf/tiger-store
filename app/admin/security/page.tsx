import { Activity, Ban, Clock3, Globe2, KeyRound, LockKeyhole, MonitorSmartphone, Network, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminSecurityOverview, isAdminSecurityUnlocked } from "@/lib/admin-security";
import { getSiteVisitorOverview } from "@/lib/site-visitors";
import {
  banAdminSessionIpAction,
  banSiteVisitorIpAction,
  changeAdminSecurityPinAction,
  createAdminUserAction,
  lockAdminSecurityAction,
  revokeAdminSessionAction,
  setAdminUserActiveAction,
  unbanAdminIpAction,
  unbanSiteVisitorIpAction,
  unlockAdminSecurityAction,
} from "./actions";

export const dynamic = "force-dynamic";

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Algiers" }).format(new Date(value));
}

function deviceName(userAgent: string) {
  const os = /Windows NT/.test(userAgent) ? "Windows PC" : /iPad/.test(userAgent) ? "iPad" : /iPhone/.test(userAgent) ? "iPhone" : /Android/.test(userAgent) ? "Android device" : /Macintosh/.test(userAgent) ? "Mac" : /Linux/.test(userAgent) ? "Linux device" : "Unknown device";
  const browserMatch = userAgent.match(/(?:Edg|Chrome|Firefox|Version)\/(\d+)/);
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Unknown browser";
  return `${os} · ${browser}${browserMatch ? ` ${browserMatch[1]}` : ""}`;
}

export default async function AdminSecurityPage({ searchParams }: { searchParams: Promise<{ error?: string; pinStatus?: string }> }) {
  const current = await requireAdmin();
  const unlocked = await isAdminSecurityUnlocked();
  const { error, pinStatus } = await searchParams;

  if (!unlocked) {
    return (
      <AdminShell title="Admin security" description="Enter the private security PIN to manage administrators, sessions, and IP bans.">
        <section className="admin-panel relative mx-auto max-w-lg overflow-hidden p-6 text-center sm:p-9">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-32 rounded-full bg-tiger-ember/10 blur-3xl" />
          <div className="relative mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-tiger-ember/30 bg-tiger-ember/10 shadow-[0_0_35px_rgba(255,107,0,0.12)]"><LockKeyhole className="h-8 w-8 text-tiger-ember" /></div>
          <h2 className="relative text-2xl font-black text-white">Security PIN required</h2>
          <p className="relative mx-auto mt-2 max-w-sm text-sm leading-6 text-white/60">Unlock administrator accounts, connected devices, and IP controls. This area locks again after 15 minutes.</p>
          {error ? <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">Incorrect PIN or too many attempts. Try again later.</p> : null}
          <form action={unlockAdminSecurityAction} className="relative mt-6 grid gap-3 text-left">
            <label className="grid gap-2 text-sm font-bold text-white">Enter PIN
              <input name="pin" type="password" inputMode="numeric" autoComplete="off" required minLength={4} maxLength={12} placeholder="••••" className="min-h-14 rounded-2xl border border-white/10 bg-black/70 px-4 text-center font-mono text-2xl tracking-[0.55em] text-white outline-none transition focus:border-tiger-ember focus:ring-4 focus:ring-tiger-ember/10" />
            </label>
            <Button type="submit" className="min-h-12"><ShieldCheck size={17} /> Unlock security</Button>
            <p className="text-center text-xs text-white/35">Five failed attempts trigger a 15-minute cooldown.</p>
          </form>
        </section>
      </AdminShell>
    );
  }

  const [overview, siteVisitors] = await Promise.all([
    getAdminSecurityOverview(current.sessionId),
    getSiteVisitorOverview(),
  ]);
  const sessionsByAccount = Array.from(overview.sessions.reduce((groups, session) => {
    const sessions = groups.get(session.email) ?? [];
    sessions.push(session);
    groups.set(session.email, sessions);
    return groups;
  }, new Map<string, typeof overview.sessions>()).entries());
  return (
    <AdminShell title="Admin security" description="Manage dashboard administrators, active sessions, and blocked IP addresses.">
      <div className="mb-4 flex justify-end">
        <form action={lockAdminSecurityAction}><button className="admin-btn"><LockKeyhole size={16} /> Lock section</button></form>
      </div>

      {current.identity.isOwner ? <section className="admin-panel relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-tiger-ember/10 blur-3xl" />
        <div className="relative mb-5 flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-tiger-ember/25 bg-tiger-ember/10"><KeyRound className="text-tiger-ember" /></div><div><h2 className="text-lg font-black text-white">Change security PIN</h2><p className="mt-1 text-sm text-white/55">Use 4 to 12 digits. Changing it immediately locks every other open security panel.</p></div></div>
        {pinStatus === "changed" ? <p className="relative mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">Security PIN changed successfully.</p> : null}
        {pinStatus === "incorrect" ? <p className="relative mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">The current PIN is incorrect.</p> : null}
        {pinStatus === "invalid" ? <p className="relative mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">Use 4 to 12 digits and make sure the new PINs match.</p> : null}
        <form action={changeAdminSecurityPinAction} className="relative grid gap-3 md:grid-cols-3">
          <input name="currentPin" type="password" inputMode="numeric" autoComplete="current-password" required minLength={4} maxLength={12} placeholder="Current PIN" className="min-h-12 rounded-xl border border-white/10 bg-black/70 px-4 text-center font-mono tracking-[0.25em] text-white outline-none focus:border-tiger-ember" />
          <input name="newPin" type="password" inputMode="numeric" autoComplete="new-password" required minLength={4} maxLength={12} placeholder="New PIN" className="min-h-12 rounded-xl border border-white/10 bg-black/70 px-4 text-center font-mono tracking-[0.25em] text-white outline-none focus:border-tiger-ember" />
          <input name="confirmPin" type="password" inputMode="numeric" autoComplete="new-password" required minLength={4} maxLength={12} placeholder="Confirm new PIN" className="min-h-12 rounded-xl border border-white/10 bg-black/70 px-4 text-center font-mono tracking-[0.25em] text-white outline-none focus:border-tiger-ember" />
          <Button type="submit" className="md:col-span-3 md:w-fit"><ShieldCheck size={17} /> Update PIN</Button>
        </form>
      </section> : null}

      <section className="admin-panel mt-5 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3"><UserPlus className="text-tiger-ember" /><div><h2 className="text-lg font-black text-white">Add administrator</h2><p className="text-sm text-white/55">New administrators can use the dashboard immediately. Passwords are stored as salted scrypt hashes.</p></div></div>
        <form action={createAdminUserAction} className="grid gap-3 md:grid-cols-3">
          <input name="displayName" required minLength={2} maxLength={80} placeholder="Display name" className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white" />
          <input name="email" required type="email" placeholder="Email" className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white" />
          <input name="password" required type="password" minLength={12} maxLength={512} autoComplete="new-password" placeholder="Temporary password (12+ characters)" className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-white" />
          <Button type="submit" className="md:col-span-3 md:w-fit"><UserPlus size={17} /> Create administrator</Button>
        </form>
      </section>

      <section className="admin-panel mt-5 overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-black text-white"><UsersRound className="text-tiger-ember" /> Site visitors</h2><p className="mt-1 text-sm text-white/55">Anonymous devices that visited the public store, newest activity first. Active means seen in the last 15 minutes.</p></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-bold text-white/70">{siteVisitors.devices.length} recent devices</span></div>
        </div>
        <div className="grid gap-3 p-4 xl:grid-cols-2 sm:p-5">
          {siteVisitors.devices.map((visitor) => {
            return <article key={visitor.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5"><MonitorSmartphone size={19} className="text-tiger-ember" /></span><div className="min-w-0"><strong className="block truncate text-white">{deviceName(visitor.userAgent)}</strong><p className="mt-0.5 font-mono text-xs text-white/55">{visitor.ip}</p></div></div><div className="flex gap-2">{visitor.isActive ? <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-200">Active now</span> : null}{visitor.isBanned ? <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-bold text-red-200">Banned</span> : null}</div></div>
              <div className="mt-4 grid gap-2 text-xs text-white/50 sm:grid-cols-2"><p className="flex items-center gap-2"><Globe2 size={14} /> Last page <span className="truncate text-white/75">{visitor.lastPage}</span></p><p className="flex items-center gap-2"><Activity size={14} /> {visitor.pageViews} page views</p><p>First seen {dateTime(visitor.firstSeenAt)}</p><p>Last seen {dateTime(visitor.lastSeenAt)}</p></div>
              <p className="mt-2 truncate text-[11px] text-white/30" title={visitor.userAgent}>{visitor.userAgent || "Browser details unavailable"}</p>
              {!visitor.isBanned ? <form action={banSiteVisitorIpAction} className="mt-4 flex flex-wrap gap-2"><input type="hidden" name="id" value={visitor.id} /><input name="reason" maxLength={300} placeholder="Ban reason" className="min-h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black px-3 text-sm text-white" /><button className="admin-btn border-red-500/30 text-red-200"><Ban size={15} /> Ban visitor IP</button></form> : null}
            </article>;
          })}
          {!siteVisitors.devices.length ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center xl:col-span-2"><UsersRound className="mx-auto mb-3 text-white/25" /><p className="text-sm text-white/55">Visitor devices will appear after their next page view.</p></div> : null}
        </div>
        {siteVisitors.bans.length ? <div className="border-t border-white/10"><h3 className="px-5 pt-5 text-sm font-black uppercase tracking-wider text-white/60">Blocked visitor IPs</h3><div className="divide-y divide-white/10">{siteVisitors.bans.map((ban) => <div key={ban.ipHash} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><strong className="font-mono text-white">{ban.ip}</strong><p className="text-sm text-white/55">{ban.reason || "No reason provided"} · blocked {dateTime(ban.bannedAt)} by {ban.createdByEmail}</p></div><form action={unbanSiteVisitorIpAction}><input type="hidden" name="ipHash" value={ban.ipHash} /><button className="admin-btn">Unban visitor</button></form></div>)}</div></div> : null}
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
        <div className="border-b border-white/10 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-black text-white"><MonitorSmartphone className="text-tiger-ember" /> Connected devices</h2><p className="mt-1 text-sm text-white/55">Every active device is grouped under the administrator account that opened it.</p></div><span className="rounded-full border border-tiger-ember/25 bg-tiger-ember/10 px-3 py-1 text-sm font-bold text-orange-200">{overview.sessions.length} active {overview.sessions.length === 1 ? "device" : "devices"}</span></div></div>
        <div className="space-y-4 p-4 sm:p-5">
          {sessionsByAccount.map(([email, sessions]) => (
            <section key={email} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-3"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-white">{sessions[0].name}</strong>{sessions[0].isOwner ? <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs text-orange-200">Owner</span> : null}</div><p className="mt-0.5 text-sm text-white/55">{email}</p></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/65">{sessions.length} {sessions.length === 1 ? "device" : "devices"}</span></header>
              <div className="divide-y divide-white/10">
                {sessions.map((session) => (
                  <article key={session.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-lg bg-white/5"><MonitorSmartphone size={18} className="text-tiger-ember" /></span><strong className="text-white">{deviceName(session.userAgent)}</strong>{session.isCurrent ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-200">This device</span> : null}</div><div className="mt-3 grid gap-2 text-xs text-white/50 sm:grid-cols-2"><p className="flex items-center gap-2"><Network size={14} /> <span className="font-mono text-white/80">{session.ip}</span></p><p className="flex items-center gap-2"><Clock3 size={14} /> Last active {dateTime(session.lastSeenAt)}</p><p>Connected {dateTime(session.createdAt)}</p><p>Expires {dateTime(session.expiresAt)}</p></div><p className="mt-2 truncate text-[11px] text-white/30" title={session.userAgent}>{session.userAgent || "Browser details unavailable"}</p></div>
                    <div className="flex flex-wrap gap-2">
                      <form action={revokeAdminSessionAction}><input type="hidden" name="id" value={session.id} /><button className="admin-btn border-amber-500/30 text-amber-200">Kick device</button></form>
                      {!session.isCurrent ? <form action={banAdminSessionIpAction} className="flex flex-wrap gap-2"><input type="hidden" name="id" value={session.id} /><input name="reason" maxLength={300} placeholder="Ban reason" className="min-h-10 w-36 rounded-lg border border-white/10 bg-black px-3 text-sm text-white" /><button className="admin-btn border-red-500/30 text-red-200"><Ban size={15} /> Ban IP</button></form> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
          {!overview.sessions.length ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center"><MonitorSmartphone className="mx-auto mb-3 text-white/25" /><p className="text-sm text-white/55">No active devices.</p></div> : null}
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
