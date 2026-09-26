import "server-only";

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-constants";
import { hashAdminIp } from "@/lib/admin-network";
import { verifyAdminPassword } from "@/lib/admin-password";
import { ADMIN_SESSION_TTL_SECONDS, createAdminSessionToken, parseAdminSession } from "@/lib/admin-session";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";

const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_LOGIN_ATTEMPTS = 5;

export type AdminIdentity = {
  id: string | null;
  email: string;
  name: string;
  isOwner: boolean;
};

type AdminSessionRow = {
  id: string;
  admin_user_id: string | null;
  admin_email: string;
  admin_name: string;
  is_owner: boolean;
  ip_hash: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
};

function constantTimeTextEqual(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export async function getCurrentAdminSession() {
  const parsed = parseAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (!parsed) return null;
  const { data, error } = await getSupabaseServiceClient()
    .from("admin_sessions")
    .select("id, admin_user_id, admin_email, admin_name, is_owner, ip_hash, last_seen_at, expires_at, revoked_at")
    .eq("id", parsed.id)
    .maybeSingle<AdminSessionRow>();
  if (error || !data || data.revoked_at || new Date(data.expires_at).getTime() <= Date.now()) return null;

  if (!data.is_owner && data.admin_user_id) {
    const { data: user } = await getSupabaseServiceClient()
      .from("admin_users")
      .select("is_active")
      .eq("id", data.admin_user_id)
      .maybeSingle<{ is_active: boolean }>();
    if (!user?.is_active) return null;
  }

  if (Date.now() - new Date(data.last_seen_at).getTime() > 60_000) {
    await getSupabaseServiceClient().from("admin_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  }
  return {
    sessionId: data.id,
    ipHash: data.ip_hash,
    identity: {
      id: data.admin_user_id,
      email: data.admin_email,
      name: data.admin_name,
      isOwner: data.is_owner,
    } satisfies AdminIdentity,
  };
}

export async function isAdminAuthenticated() {
  return (await getCurrentAdminSession()) !== null;
}

export async function requireAdmin() {
  const session = await getCurrentAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireAdminAction() {
  const session = await requireAdmin();
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!origin || !host || new URL(origin).origin !== `${proto}://${host}`) throw new Error("Invalid request origin.");
  return session;
}

export async function canAttemptAdminLogin(ip: string) {
  const ipHash = hashAdminIp(ip);
  const client = getSupabaseServiceClient();
  const [{ count, error }, { data: ban, error: banError }] = await Promise.all([
    client.from("admin_login_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash)
      .gte("attempted_at", new Date(Date.now() - LOGIN_WINDOW_SECONDS * 1000).toISOString()),
    client.from("admin_ip_bans").select("ip_hash").eq("ip_hash", ipHash).maybeSingle(),
  ]);
  if (error || banError) throw new Error("Admin login security store unavailable.");
  return !ban && (count ?? 0) < MAX_LOGIN_ATTEMPTS;
}

export async function recordFailedAdminLogin(ip: string) {
  const { error } = await getSupabaseServiceClient().from("admin_login_attempts").insert({ ip_hash: hashAdminIp(ip) });
  if (error) throw new Error("Admin login rate-limit store unavailable.");
}

export async function verifyAdminCredentials(email: string, password: string): Promise<AdminIdentity | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const env = getServerEnv();
  if (constantTimeTextEqual(normalizedEmail, env.ADMIN_EMAIL.trim().toLowerCase()) && constantTimeTextEqual(password, env.ADMIN_PASSWORD)) {
    return { id: null, email: env.ADMIN_EMAIL.trim().toLowerCase(), name: "Owner", isOwner: true };
  }

  const { data, error } = await getSupabaseServiceClient()
    .from("admin_users")
    .select("id, email, display_name, password_hash, is_active")
    .eq("email", normalizedEmail)
    .maybeSingle<{ id: string; email: string; display_name: string; password_hash: string; is_active: boolean }>();
  if (error || !data || !data.is_active || !verifyAdminPassword(password, data.password_hash)) return null;
  return { id: data.id, email: data.email, name: data.display_name, isOwner: false };
}

export async function createTrackedAdminSession(identity: AdminIdentity, ipHash: string, encryptedIp: string, userAgent: string) {
  const id = randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const { error } = await getSupabaseServiceClient().from("admin_sessions").insert({
    id,
    admin_user_id: identity.id,
    admin_email: identity.email,
    admin_name: identity.name,
    is_owner: identity.isOwner,
    ip_hash: ipHash,
    ip_encrypted: encryptedIp,
    user_agent: userAgent.slice(0, 500),
    expires_at: new Date(expiresAt * 1000).toISOString(),
  });
  if (error) throw new Error("Admin session could not be created.");
  return { token: createAdminSessionToken(id, expiresAt), maxAge: ADMIN_SESSION_TTL_SECONDS };
}

export async function revokeCurrentAdminSession() {
  const parsed = parseAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
  if (parsed) await getSupabaseServiceClient().from("admin_sessions").update({ revoked_at: new Date().toISOString(), revoked_reason: "Signed out" }).eq("id", parsed.id);
}

export function safeAdminDestination(value: string | undefined) {
  return value && /^\/admin(?:\/|$)/.test(value) && !value.startsWith("/admin/login") && !value.includes("//") ? value : "/admin";
}
