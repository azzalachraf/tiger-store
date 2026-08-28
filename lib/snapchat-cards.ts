import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { getEncryptionSecret } from "@/lib/env";
export { cardLabel, cardsForPlan, isSnapchatCardType, isSnapchatPlan, sheetCardType, snapchatCardTypes, snapchatPlans } from "@/lib/snapchat-card-mapping";
export type { SnapchatCardType, SnapchatPlanMonths } from "@/lib/snapchat-card-mapping";

function key() { return createHash("sha256").update(getEncryptionSecret()).digest(); }
export function redeemCodeHash(code: string) { return createHmac("sha256", key()).update(code.trim()).digest("hex"); }
export function encryptRedeemCode(code: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}
export function decryptRedeemCode(value: string) {
  const [version, iv, tag, encrypted] = value.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Invalid encrypted redeem code.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}
