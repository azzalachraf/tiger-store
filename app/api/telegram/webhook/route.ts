import { timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { handleTelegramOperationsCallback, handleTelegramOperationsMessage } from "@/lib/telegram-operations";
import { telegramWebhookUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

function equalSecret(received: string | null, expected: string) {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const env = getServerEnv();
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_OWNER_ID || !env.TELEGRAM_WEBHOOK_SECRET) {
    return Response.json({ ok: false }, { status: 503 });
  }
  if (!equalSecret(request.headers.get("x-telegram-bot-api-secret-token"), env.TELEGRAM_WEBHOOK_SECRET)) {
    return Response.json({ ok: false }, { status: 403 });
  }

  const parsed = telegramWebhookUpdateSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return Response.json({ ok: true });

  if (parsed.data.callback_query) {
    const callback = parsed.data.callback_query;
    if (callback.from.is_bot) return Response.json({ ok: true });
    try {
      await handleTelegramOperationsCallback({ callbackId: callback.id, chatId: callback.message?.chat.id, chatType: callback.message?.chat.type, userId: callback.from.id, firstName: callback.from.first_name, username: callback.from.username, languageCode: callback.from.language_code, data: callback.data });
    } catch { return Response.json({ ok: false }, { status: 500 }); }
    return Response.json({ ok: true });
  }
  if (!parsed.data.message) return Response.json({ ok: true });

  const message = parsed.data.message;
  if (message.from.is_bot) return Response.json({ ok: true });
  try {
    await handleTelegramOperationsMessage({
      chatId: message.chat.id,
      chatType: message.chat.type,
      userId: message.from.id,
      firstName: message.from.first_name,
      username: message.from.username,
      languageCode: message.from.language_code,
      text: message.text,
    });
  } catch {
    // Telegram retries transient failures. Do not log the update payload:
    // it may include registration IDs or customer information.
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true });
}
