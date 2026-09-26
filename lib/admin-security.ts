import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SECURITY_COOKIE } from "@/lib/admin-constants";
import { requireAdmin, requireAdminAction } from "@/lib/admin-auth";
import { decryptAdminIp } from "@/lib/admin-network";
import { isValidAdminSecurityToken } from "@/lib/admin-session";
import { getSupabaseServiceClient } from "@/lib/supabase";

export async function isAdminSecurityUnlocked() {
  return isValidAdminSecurityToken((await cookies()).get(ADMIN_SECURITY_COOKIE)?.value);
}

export async function requireAdminSecurity() {
  const session = await requireAdmin();
  if (!(await isAdminSecurityUnlocked())) redirect("/admin/security");
  return session;
}

export async function requireAdminSecurityAction() {
  const session = await requireAdminAction();
  if (!(await isAdminSecurityUnlocked())) throw new Error("Security PIN required.");
  return session;
}

export async function getAdminSecurityOverview(currentSessionId: string) {
  const client = getSupabaseServiceClient();
  const [usersResult, sessionsResult, bansResult] = await Promise.all([
    client.from("admin_users").select("id, email, display_name, is_active, created_at, updated_at").order("created_at", { ascending: false }),
    client.from("admin_sessions").select("id, admin_email, admin_name, is_owner, ip_hash, ip_encrypted, user_agent, created_at, last_seen_at, expires_at")
      .is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("last_seen_at", { ascending: false }).limit(100),
    client.from("admin_ip_bans").select("ip_hash, ip_encrypted, reason, created_by_email, banned_at").order("banned_at", { ascending: false }),
  ]);
  if (usersResult.error || sessionsResult.error || bansResult.error) throw new Error("Admin security data could not be loaded.");
  return {
    users: (usersResult.data ?? []).map((row) => ({
      id: String(row.id), email: String(row.email), displayName: String(row.display_name),
      isActive: Boolean(row.is_active), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    })),
    sessions: (sessionsResult.data ?? []).map((row) => ({
      id: String(row.id), email: String(row.admin_email), name: String(row.admin_name), isOwner: Boolean(row.is_owner),
      ipHash: String(row.ip_hash), ip: decryptAdminIp(String(row.ip_encrypted)), userAgent: String(row.user_agent),
      createdAt: String(row.created_at), lastSeenAt: String(row.last_seen_at), expiresAt: String(row.expires_at),
      isCurrent: String(row.id) === currentSessionId,
    })),
    bans: (bansResult.data ?? []).map((row) => ({
      ipHash: String(row.ip_hash), ip: decryptAdminIp(String(row.ip_encrypted)), reason: String(row.reason),
      createdByEmail: String(row.created_by_email), bannedAt: String(row.banned_at),
    })),
  };
}
