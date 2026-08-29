import { z } from "zod";
import type { SnapchatCardType } from "@/lib/snapchat-card-mapping";

const redeemCodeSchema = z.string()
  .trim()
  .min(3)
  .max(512)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N}\s_:-]*$/u, "Invalid card code.");

function extractRedeemCode(line: string) {
  if (!/^https?:\/\//i.test(line)) return line;
  const url = new URL(line);
  if (url.protocol !== "https:" || url.hostname !== "apps.apple.com" || !/^\/redeem\/?$/.test(url.pathname)) {
    throw new Error("Unsupported redemption link.");
  }
  const code = url.searchParams.get("code");
  if (!code) throw new Error("Apple redemption link is missing its code.");
  return code;
}

/** Parse the lines pasted after the owner selected a card type. */
export function parseTelegramRedeemCardLines(_cardType: SnapchatCardType, message: string): string[] {
  const lines = message.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 1 || lines.length > 100) throw new Error("Send between 1 and 100 codes.");

  const codes = lines.map((line) => redeemCodeSchema.parse(extractRedeemCode(line)));
  if (new Set(codes).size !== codes.length) throw new Error("Remove duplicate codes from this upload.");
  return codes;
}
