import { z } from "zod";
import { snapchatCardTypeSchema } from "@/lib/validation";
import type { SnapchatCardType } from "@/lib/snapchat-card-mapping";

const redeemCodeSchema = z.string()
  .trim()
  .min(3)
  .max(512)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N}\s_:-]*$/u, "Invalid card code.");

export type TelegramRedeemCardUpload = {
  cardType: SnapchatCardType;
  codes: string[];
};

/** Parse a private Telegram bulk upload without normalizing the redeem codes. */
export function parseTelegramRedeemCardUpload(message: string): TelegramRedeemCardUpload {
  const match = message.match(/^\/upload(?:@[A-Za-z0-9_]{5,})?\s+([^\s\r\n]+)\s*\r?\n([\s\S]+)$/i);
  if (!match) throw new Error("Use one card type followed by one code per line.");

  const cardType = snapchatCardTypeSchema.safeParse(match[1].toLowerCase());
  if (!cardType.success) throw new Error("Invalid card type.");

  const lines = match[2].split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 1 || lines.length > 100) throw new Error("Send between 1 and 100 codes.");

  const codes = lines.map((code) => redeemCodeSchema.parse(code));
  if (new Set(codes).size !== codes.length) throw new Error("Remove duplicate codes from this upload.");
  return { cardType: cardType.data, codes };
}
