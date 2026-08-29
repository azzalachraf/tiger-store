import { z } from "zod";
import type { SnapchatCardType } from "@/lib/snapchat-card-mapping";

const redeemCodeSchema = z.string()
  .trim()
  .min(3)
  .max(512)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N}\s_:-]*$/u, "Invalid card code.");

/** Parse the lines pasted after the owner selected a card type. */
export function parseTelegramRedeemCardLines(_cardType: SnapchatCardType, message: string): string[] {
  const lines = message.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 1 || lines.length > 100) throw new Error("Send between 1 and 100 codes.");

  const codes = lines.map((code) => redeemCodeSchema.parse(code));
  if (new Set(codes).size !== codes.length) throw new Error("Remove duplicate codes from this upload.");
  return codes;
}
