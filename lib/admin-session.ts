import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env";

const SESSION_TTL_SECONDS = 60 * 60 * 8;

function sessionKey() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET } = getServerEnv();
  // Changing either credential invalidates existing sessions.
  return createHmac("sha256", SESSION_SECRET).update(ADMIN_EMAIL).update("\0").update(ADMIN_PASSWORD).digest();
}

function signature(payload: string) {
  return createHmac("sha256", sessionKey()).update(payload).digest("hex");
}

export function createAdminSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${expiresAt}.${randomBytes(16).toString("hex")}`;
  return `v2.${payload}.${signature(payload)}`;
}

export function isValidAdminSession(cookieToken: string | undefined) {
  if (!cookieToken) return false;
  const [version, expiresAt, nonce, suppliedSignature, extra] = cookieToken.split(".");
  if (extra || version !== "v2" || !/^\d{10}$/.test(expiresAt ?? "") || !/^[a-f0-9]{32}$/.test(nonce ?? "") || !suppliedSignature) return false;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;
  const expected = signature(`${expiresAt}.${nonce}`);
  if (suppliedSignature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expected));
}
