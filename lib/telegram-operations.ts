import "server-only";

import { randomBytes } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { TelegramInterfaceLocale, TelegramRole } from "@/lib/types";

type TelegramIdentity = {
  userId: string;
  firstName?: string;
  username?: string;
  suggestedLocale: TelegramInterfaceLocale;
};

type TelegramUserRow = {
  telegram_user_id: string | number;
  interface_locale: TelegramInterfaceLocale;
  role: TelegramRole;
  registration_id: string;
};

function telegramId(value: number) {
  return String(value);
}

function textFor(locale: TelegramInterfaceLocale, arabic: string, english: string) {
  return locale === "ar" ? arabic : english;
}

function registrationId() {
  return `TG-${randomBytes(5).toString("hex").toUpperCase().slice(0, 8)}`;
}

async function reply(chatId: string, text: string) {
  const token = getServerEnv().TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
}

async function audit(actorTelegramUserId: string, entityType: "telegram_user", entityId: string, action: string, metadata: Record<string, string>) {
  await getSupabaseServiceClient().from("operation_events").insert({
    actor_telegram_user_id: actorTelegramUserId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    metadata,
  });
}

async function findOperator(userId: string) {
  const { data } = await getSupabaseServiceClient()
    .from("telegram_users")
    .select("telegram_user_id, interface_locale, role, registration_id")
    .eq("telegram_user_id", userId)
    .maybeSingle();
  return data as TelegramUserRow | null;
}

async function registerIdentity(identity: TelegramIdentity) {
  const client = getSupabaseServiceClient();
  const env = getServerEnv();
  const ownerId = env.TELEGRAM_OWNER_ID;
  const owner = Boolean(ownerId && ownerId === identity.userId);
  const existing = await findOperator(identity.userId);

  if (existing) {
    const update = {
      username: identity.username ?? null,
      first_name: identity.firstName ?? null,
      last_seen_at: new Date().toISOString(),
      ...(owner && existing.role !== "owner" ? { role: "owner" as const, approved_at: new Date().toISOString(), approved_by_telegram_user_id: identity.userId } : {}),
    };
    await client.from("telegram_users").update(update).eq("telegram_user_id", identity.userId);
    return { ...existing, role: owner ? "owner" as const : existing.role };
  }

  // A collision is extremely unlikely; retry without ever placing the code in a log.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = registrationId();
    const role: TelegramRole = owner ? "owner" : "pending";
    const { data, error } = await client.from("telegram_users").insert({
      telegram_user_id: identity.userId,
      username: identity.username ?? null,
      first_name: identity.firstName ?? null,
      interface_locale: identity.suggestedLocale,
      role,
      registration_id: code,
      approved_by_telegram_user_id: owner ? identity.userId : null,
      approved_at: owner ? new Date().toISOString() : null,
    }).select("telegram_user_id, interface_locale, role, registration_id").single();
    if (!error && data) {
      await audit(identity.userId, "telegram_user", identity.userId, owner ? "owner_bootstrapped" : "registration_requested", { role, locale: identity.suggestedLocale });
      return data as TelegramUserRow;
    }
  }
  throw new Error("Telegram registration could not be saved.");
}

function command(text: string | undefined) {
  return (text ?? "").trim().split(/\s+/);
}

export async function handleTelegramOperationsMessage(input: {
  chatId: number;
  chatType: string;
  userId: number;
  firstName?: string;
  username?: string;
  languageCode?: string;
  text?: string;
}) {
  // Operations commands are private by design: group membership is not an
  // authorization boundary and registration IDs must never be posted in groups.
  if (input.chatType !== "private") return;

  const identity: TelegramIdentity = {
    userId: telegramId(input.userId),
    firstName: input.firstName,
    username: input.username,
    suggestedLocale: input.languageCode?.toLowerCase().startsWith("ar") ? "ar" : "en",
  };
  const user = await registerIdentity(identity);
  const locale = user.interface_locale;
  const [rawCommand, argument] = command(input.text);
  const action = rawCommand.toLowerCase().split("@")[0];
  const chatId = telegramId(input.chatId);

  if (action === "/ar" || action === "/en") {
    const chosen = action === "/ar" ? "ar" : "en";
    await getSupabaseServiceClient().from("telegram_users").update({ interface_locale: chosen }).eq("telegram_user_id", identity.userId);
    await audit(identity.userId, "telegram_user", identity.userId, "locale_changed", { locale: chosen });
    await reply(chatId, textFor(chosen, "تم حفظ اللغة العربية.", "English has been saved."));
    return;
  }

  if (action === "/approve") {
    if (user.role !== "owner") {
      await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised."));
      return;
    }
    const registration = argument?.toUpperCase();
    if (!registration || !/^TG-[A-Z0-9]{8}$/.test(registration)) {
      await reply(chatId, textFor(locale, "استعمل: /approve TG-XXXXXXXX", "Use: /approve TG-XXXXXXXX"));
      return;
    }
    const { data: candidate } = await getSupabaseServiceClient().from("telegram_users")
      .select("telegram_user_id, role")
      .eq("registration_id", registration)
      .maybeSingle();
    if (!candidate || candidate.role !== "pending") {
      await reply(chatId, textFor(locale, "طلب التسجيل غير موجود أو تمت معالجته.", "The registration was not found or was already processed."));
      return;
    }
    const candidateId = String(candidate.telegram_user_id);
    await getSupabaseServiceClient().from("telegram_users").update({
      role: "admin",
      approved_by_telegram_user_id: identity.userId,
      approved_at: new Date().toISOString(),
    }).eq("telegram_user_id", candidateId).eq("role", "pending");
    await audit(identity.userId, "telegram_user", candidateId, "admin_approved", { role: "admin" });
    await reply(chatId, textFor(locale, "تمت الموافقة ومنح صلاحية الإدارة.", "Approved and granted admin access."));
    return;
  }

  if (action === "/whoami") {
    await reply(chatId, textFor(locale, `دورك الحالي: ${user.role}`, `Your current role: ${user.role}`));
    return;
  }

  if (action === "/start" || !action) {
    if (user.role === "pending") {
      await reply(chatId, textFor(locale,
        "تم تسجيل طلبك. أرسل معرّف التسجيل التالي للمالك للموافقة عليه:\n" + user.registration_id,
        "Your request is registered. Send this registration ID to the owner for approval:\n" + user.registration_id));
    } else {
      await reply(chatId, textFor(locale,
        "أهلاً بك. الأوامر: /whoami، /ar، /en" + (user.role === "owner" ? "، /approve TG-XXXXXXXX" : ""),
        "Welcome. Commands: /whoami, /ar, /en" + (user.role === "owner" ? ", /approve TG-XXXXXXXX" : "")));
    }
    return;
  }

  await reply(chatId, textFor(locale, "أمر غير معروف. أرسل /start للمساعدة.", "Unknown command. Send /start for help."));
}
