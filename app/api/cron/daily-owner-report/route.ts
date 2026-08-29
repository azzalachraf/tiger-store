import { timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { sendOwnerDailyReport } from "@/lib/telegram-operations";

export const runtime = "nodejs";

function authorized(value: string | null, secret: string) {
  if (!value || !secret) return false;
  const left = Buffer.from(value); const right = Buffer.from(`Bearer ${secret}`);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"), getServerEnv().CRON_SECRET)) return Response.json({ ok: false }, { status: 401 });
  try { const result = await sendOwnerDailyReport(); return Response.json({ ok: true, sent: result.sent }); } catch { return Response.json({ ok: false }, { status: 500 }); }
}
