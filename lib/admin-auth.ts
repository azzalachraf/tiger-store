import "server-only";
import { createHash, createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-constants";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";

const SESSION_TTL_SECONDS = 60 * 60 * 8; const LOGIN_WINDOW_SECONDS = 15 * 60; const MAX_LOGIN_ATTEMPTS = 5;
type SessionPayload = { sub: "admin"; iat: number; exp: number; nonce: string };
function constantTimeEqual(a: Buffer, b: Buffer) { return a.length === b.length && timingSafeEqual(a, b); }
function configuration() { const env = getServerEnv(); return env.ADMIN_PASSWORD_HASH && env.SESSION_SECRET ? env : null; }
export function normalizeClientIp(value: string | null) { return (value?.split(",")[0]?.trim().replace(/^::ffff:/, "") ?? "unknown").slice(0, 64); }
function hashIp(ip: string, secret: string) { return createHmac("sha256", secret).update(ip).digest("hex"); }
function sign(encoded: string, secret: string) { return createHmac("sha256", secret).update(encoded).digest("base64url"); }
function verifyScrypt(password: string, stored: string) { const [kind, n, r, p, salt, expected] = stored.split("$"); if (kind !== "scrypt" || !n || !r || !p || !salt || !expected) return false; const actual = scryptSync(password, Buffer.from(salt, "base64url"), 64, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 }); return constantTimeEqual(actual, Buffer.from(expected, "base64url")); }
export function createAdminSession() { const env = configuration(); if (!env) throw new Error("Admin authentication is not configured."); const now = Math.floor(Date.now() / 1000); const encoded = Buffer.from(JSON.stringify({ sub: "admin", iat: now, exp: now + SESSION_TTL_SECONDS, nonce: crypto.randomUUID() } satisfies SessionPayload)).toString("base64url"); return `v1.${encoded}.${sign(encoded, env.SESSION_SECRET!)}`; }
export async function isAdminAuthenticated() { const env = configuration(); const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value; const [version, encoded, signature] = token?.split(".") ?? []; if (!env || version !== "v1" || !encoded || !signature || !constantTimeEqual(Buffer.from(signature), Buffer.from(sign(encoded, env.SESSION_SECRET!)))) return false; try { const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload; return payload.sub === "admin" && payload.exp > Math.floor(Date.now() / 1000); } catch { return false; } }
export async function requireAdmin() { if (!(await isAdminAuthenticated())) redirect("/admin/login"); }
export async function requireAdminAction() { await requireAdmin(); const h = await headers(); const origin = h.get("origin"); const host = h.get("x-forwarded-host") ?? h.get("host"); const proto = h.get("x-forwarded-proto") ?? "https"; if (!origin || !host || new URL(origin).origin !== `${proto}://${host}`) throw new Error("Invalid request origin."); }
export async function canAttemptAdminLogin(ip: string) { const env = configuration(); if (!env) return false; const { count, error } = await getSupabaseServiceClient().from("admin_login_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", hashIp(ip, env.SESSION_SECRET!)).gte("attempted_at", new Date(Date.now() - LOGIN_WINDOW_SECONDS * 1000).toISOString()); return !error && (count ?? 0) < MAX_LOGIN_ATTEMPTS; }
export async function recordFailedAdminLogin(ip: string) { const env = configuration(); if (env) await getSupabaseServiceClient().from("admin_login_attempts").insert({ ip_hash: hashIp(ip, env.SESSION_SECRET!) }); }
export function verifyAdminCredentials(email: string, password: string) { const env = configuration(); if (!env) return false; const emailMatch = constantTimeEqual(createHash("sha256").update(email.trim().toLowerCase()).digest(), createHash("sha256").update(env.ADMIN_EMAIL.trim().toLowerCase()).digest()); return emailMatch && verifyScrypt(password, env.ADMIN_PASSWORD_HASH!); }
export function safeAdminDestination(value: string | undefined) { return value && /^\/admin(?:\/|$)/.test(value) && !value.startsWith("/admin/login") && !value.includes("//") ? value : "/admin"; }
