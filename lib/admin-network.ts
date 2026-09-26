import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { getServerEnv } from "@/lib/env";

function encryptionKey() {
  return createHash("sha256").update(getServerEnv().ENCRYPTION_KEY).digest();
}

export function normalizeClientIp(value: string | null) {
  return (value?.split(",")[0]?.trim().replace(/^::ffff:/, "") ?? "unknown").slice(0, 64);
}

export function hashAdminIp(ip: string) {
  return createHmac("sha256", getServerEnv().SESSION_SECRET).update(ip).digest("hex");
}

export function encryptAdminIp(ip: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(ip, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptAdminIp(value: string) {
  try {
    const [version, iv, tag, encrypted] = value.split(":");
    if (version !== "v1" || !iv || !tag || !encrypted) return "Unavailable";
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return "Unavailable";
  }
}
