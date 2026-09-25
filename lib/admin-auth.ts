import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-constants";
import { isValidAdminSession } from "@/lib/admin-session";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";

const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_LOGIN_ATTEMPTS = 5;

function constantTimeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function normalizeClientIp(value: string | null) {
  return (value?.split(",")[0]?.trim().replace(/^::ffff:/, "") ?? "unknown").slice(0, 64);
}

function hashIp(ip: string, secret: string) {
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export async function isAdminAuthenticated() {
  return isValidAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

export async function requireAdminAction() {
  await requireAdmin();
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!origin || !host || new URL(origin).origin !== `${proto}://${host}`) {
    throw new Error("Invalid request origin.");
  }
}

export async function canAttemptAdminLogin(ip: string) {
  const { SESSION_SECRET } = getServerEnv();
  const { count, error } = await getSupabaseServiceClient()
    .from("admin_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", hashIp(ip, SESSION_SECRET))
    .gte("attempted_at", new Date(Date.now() - LOGIN_WINDOW_SECONDS * 1000).toISOString());
  if (error) throw new Error("Admin login rate-limit store unavailable.");
  return (count ?? 0) < MAX_LOGIN_ATTEMPTS;
}

export async function recordFailedAdminLogin(ip: string) {
  const { SESSION_SECRET } = getServerEnv();
  const { error } = await getSupabaseServiceClient()
    .from("admin_login_attempts")
    .insert({ ip_hash: hashIp(ip, SESSION_SECRET) });
  if (error) throw new Error("Admin login rate-limit store unavailable.");
}

export function verifyAdminCredentials(email: string, password: string) {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = getServerEnv();
  const emailMatch = constantTimeEqual(
    createHash("sha256").update(email.trim().toLowerCase()).digest(),
    createHash("sha256").update(ADMIN_EMAIL.trim().toLowerCase()).digest(),
  );
  const passwordMatch = constantTimeEqual(
    createHash("sha256").update(password).digest(),
    createHash("sha256").update(ADMIN_PASSWORD).digest(),
  );
  return emailMatch && passwordMatch;
}

export function safeAdminDestination(value: string | undefined) {
  return value && /^\/admin(?:\/|$)/.test(value) && !value.startsWith("/admin/login") && !value.includes("//")
    ? value
    : "/admin";
}
