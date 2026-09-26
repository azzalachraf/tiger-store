import { createHmac, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env";

export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;
export const ADMIN_SECURITY_TTL_SECONDS = 60 * 15;

type ParsedAdminSession = { id: string; expiresAt: number };

function sign(namespace: string, payload: string) {
  return createHmac("sha256", getServerEnv().SESSION_SECRET)
    .update(namespace)
    .update("\0")
    .update(payload)
    .digest("hex");
}

function matchesSignature(supplied: string, expected: string) {
  return supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export function createAdminSessionToken(id: string, expiresAt: number) {
  const payload = `${id}.${expiresAt}`;
  return `v3.${payload}.${sign("admin-session", payload)}`;
}

export function parseAdminSession(cookieToken: string | undefined): ParsedAdminSession | null {
  if (!cookieToken) return null;
  const [version, id, expiresAt, suppliedSignature, extra] = cookieToken.split(".");
  if (extra || version !== "v3" || !/^[0-9a-f-]{36}$/.test(id ?? "") || !/^\d{10}$/.test(expiresAt ?? "") || !suppliedSignature) return null;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return null;
  const expected = sign("admin-session", `${id}.${expiresAt}`);
  return matchesSignature(suppliedSignature, expected) ? { id, expiresAt: Number(expiresAt) } : null;
}

export function isValidAdminSession(cookieToken: string | undefined) {
  return parseAdminSession(cookieToken) !== null;
}

export function createAdminSecurityToken(expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SECURITY_TTL_SECONDS) {
  const payload = String(expiresAt);
  const pinBoundSecret = createHmac("sha256", getServerEnv().SESSION_SECRET)
    .update(getServerEnv().ADMIN_SECURITY_PIN)
    .digest("hex");
  const signature = createHmac("sha256", pinBoundSecret).update(payload).digest("hex");
  return `v1.${payload}.${signature}`;
}

export function isValidAdminSecurityToken(cookieToken: string | undefined) {
  if (!cookieToken) return false;
  const [version, expiresAt, suppliedSignature, extra] = cookieToken.split(".");
  if (extra || version !== "v1" || !/^\d{10}$/.test(expiresAt ?? "") || !suppliedSignature) return false;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  const pinBoundSecret = createHmac("sha256", getServerEnv().SESSION_SECRET)
    .update(getServerEnv().ADMIN_SECURITY_PIN)
    .digest("hex");
  const expected = createHmac("sha256", pinBoundSecret).update(expiresAt).digest("hex");
  return matchesSignature(suppliedSignature, expected);
}
