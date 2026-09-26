import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashAdminPassword(password: string) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", "16384", "8", "1", salt.toString("base64url"), derived.toString("base64url")].join("$");
}

export function verifyAdminPassword(password: string, stored: string) {
  const [kind, n, r, p, salt, expected] = stored.split("$");
  if (kind !== "scrypt" || !n || !r || !p || !salt || !expected) return false;
  try {
    const actual = scryptSync(password, Buffer.from(salt, "base64url"), KEY_LENGTH, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
    });
    const expectedBuffer = Buffer.from(expected, "base64url");
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  } catch {
    return false;
  }
}
