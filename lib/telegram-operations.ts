import "server-only";

import { randomBytes } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { TelegramInterfaceLocale, TelegramRole } from "@/lib/types";
import { snapchatCallbackDataSchema } from "@/lib/validation";
import { cardLabel, cardsForPlan, snapchatCardTypes, type SnapchatCardType, type SnapchatPlanMonths } from "@/lib/snapchat-cards";
import { claimSnapchatCard, finishSnapchatOperation, syncRedeemInventory } from "@/lib/snapchat-operations";
import { completeSnapchatSale } from "@/lib/telegram-warranty";
import { absoluteUrl } from "@/lib/seo";
import { getAdminFinanceSummary } from "@/lib/finance";
import { syncFinanceReporting } from "@/lib/google-finance-sheet";

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

type InlineKeyboard = { inline_keyboard: { text: string; callback_data: string }[][] };

async function telegramCall(method: string, body: Record<string, unknown>) {
  const token = getServerEnv().TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function reply(chatId: string, text: string, replyMarkup?: InlineKeyboard) {
  await telegramCall("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}

async function answerCallback(id: string) { await telegramCall("answerCallbackQuery", { callback_query_id: id }); }

async function audit(actorTelegramUserId: string, entityType: "telegram_user" | "inventory" | "setting", entityId: string, action: string, metadata: Record<string, string>) {
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

function planLabel(plan: SnapchatPlanMonths, locale: TelegramInterfaceLocale) {
  return locale === "ar" ? `${plan} ${plan === 1 ? "شهر" : "أشهر"}` : `${plan} month${plan === 1 ? "" : "s"}`;
}

async function sendSnapchatPlans(chatId: string, locale: TelegramInterfaceLocale) {
  const plans: SnapchatPlanMonths[] = [1, 2, 3, 6, 12];
  await reply(chatId, textFor(locale, "اختر مدة Snapchat Plus.", "Choose the Snapchat Plus plan."), {
    inline_keyboard: plans.map((plan) => [{ text: planLabel(plan, locale), callback_data: `sc|${plan}` }]),
  });
}

async function notifyLowStock(counts: Partial<Record<SnapchatCardType, number>>, actorId: string) {
  const client = getSupabaseServiceClient();
  const { data: owner } = await client.from("telegram_users").select("telegram_user_id, interface_locale").eq("role", "owner").maybeSingle();
  if (!owner) return;
  const notify: [SnapchatCardType, number][] = [];
  for (const cardType of snapchatCardTypes) {
    const count = counts[cardType] ?? 0;
    const { data: previous } = await client.from("redeem_card_stock_alerts").select("available_count").eq("card_type", cardType).maybeSingle();
    if (count >= 5) { if (previous) await client.from("redeem_card_stock_alerts").delete().eq("card_type", cardType); continue; }
    if (previous?.available_count === count) continue;
    await client.from("redeem_card_stock_alerts").upsert({ card_type: cardType, available_count: count, last_notified_at: new Date().toISOString() });
    notify.push([cardType, count]);
  }
  if (!notify.length) return;
  const ownerLocale = owner.interface_locale as TelegramInterfaceLocale;
  const text = notify.map(([cardType, count]) => `${cardLabel(cardType, ownerLocale)}: ${count}`).join("\n");
  await reply(String(owner.telegram_user_id), textFor(ownerLocale, `تنبيه المخزون منخفض (أقل من 5):\n${text}`, `Low card stock (under 5):\n${text}`));
  await audit(actorId, "inventory", "redeem-stock", "low_stock_notified", { types: notify.map(([type]) => type).join(",") });
}

export async function handleTelegramOperationsCallback(input: {
  callbackId: string; chatId?: number; chatType?: string; userId: number; firstName?: string; username?: string; languageCode?: string; data: string;
}) {
  await answerCallback(input.callbackId);
  if (input.chatType !== "private" || !input.chatId) return;
  const identity: TelegramIdentity = { userId: telegramId(input.userId), firstName: input.firstName, username: input.username, suggestedLocale: input.languageCode?.toLowerCase().startsWith("ar") ? "ar" : "en" };
  const user = await registerIdentity(identity);
  const locale = user.interface_locale;
  if (user.role !== "admin" && user.role !== "owner") { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
  const parts = input.data.split("|");
  const parsed = snapchatCallbackDataSchema.safeParse(parts.map((part, index) => index === 1 && /^\d+$/.test(part) ? Number(part) : part));
  if (!parsed.success) { await reply(String(input.chatId), textFor(locale, "انتهت صلاحية هذا الاختيار.", "This selection has expired.")); return; }
  const selected = parsed.data;
  if (selected[0] === "sc" && selected.length === 2) {
    const plan = selected[1];
    await reply(String(input.chatId), textFor(locale, "اختر نوع البطاقة.", "Choose the card type."), { inline_keyboard: cardsForPlan(plan).map((cardType) => [{ text: cardLabel(cardType, locale), callback_data: `sc|${plan}|${cardType}` }]) });
    return;
  }
  if (selected[0] === "sc" && selected.length === 3) {
    const [, plan, cardType] = selected;
    try {
      const operation = await claimSnapchatCard(identity.userId, plan, cardType);
      await reply(String(input.chatId), textFor(locale, `تم إنشاء العملية. هذا الكود خاص بك فقط:\n${operation.code}`, `Operation created. This code is private to you:\n${operation.code}`), { inline_keyboard: [[
        { text: textFor(locale, "إكمال", "Complete"), callback_data: `op|${operation.operationId}|complete` },
        { text: textFor(locale, "إلغاء", "Cancel"), callback_data: `op|${operation.operationId}|cancel` },
      ]] });
    } catch {
      await reply(String(input.chatId), textFor(locale, "لا يوجد كود متاح لهذا النوع حالياً.", "No code is currently available for this card type."));
    }
    return;
  }
  if (selected[0] === "op") {
    const [, operationId, outcome] = selected;
    try {
      if (outcome === "complete") {
        const sale = await completeSnapchatSale({ operationId, adminTelegramUserId: identity.userId });
        await reply(String(input.chatId), textFor(locale, `تم إكمال البيع. أرسل رابط الضمان الخاص للعميل:\n${absoluteUrl(`/w/${sale.token}`)}`, `Sale completed. Send this private warranty link to the customer:\n${absoluteUrl(`/w/${sale.token}`)}`));
      } else {
        await finishSnapchatOperation(operationId, identity.userId, "cancelled");
        await reply(String(input.chatId), textFor(locale, "تم إلغاء العملية وإرجاع البطاقة للمخزون.", "Operation cancelled and the card is available again."));
      }
    } catch {
      await reply(String(input.chatId), textFor(locale, "هذه العملية غير متاحة لك أو تمت معالجتها.", "This operation is unavailable to you or was already handled."));
    }
  }
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

  if (action === "/snapchat") {
    if (user.role !== "admin" && user.role !== "owner") {
      await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised."));
      return;
    }
    await sendSnapchatPlans(chatId, locale);
    return;
  }

  if (action === "/sync_cards") {
    if (user.role !== "owner") {
      await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised."));
      return;
    }
    try {
      const result = await syncRedeemInventory();
      await audit(identity.userId, "inventory", "redeem-sheet", "redeem_sheet_synchronized", { count: String(result.synchronized) });
      await reply(chatId, textFor(locale, `تمت مزامنة ${result.synchronized} بطاقة من الجدول.`, `${result.synchronized} cards were synchronized from the sheet.`));
      await notifyLowStock(result.counts, identity.userId);
    } catch {
      await reply(chatId, textFor(locale, "تعذرت مزامنة المخزون. راجع إعدادات الوصول إلى الجدول.", "Inventory synchronization failed. Check the sheet access settings."));
    }
    return;
  }

  if (action === "/stats") {
    if (user.role !== "admin" && user.role !== "owner") { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try {
      const summary = await getAdminFinanceSummary(identity.userId);
      await reply(chatId, textFor(locale, `إحصاءاتك:\nطلبات مكتملة: ${summary.completedOrders}\nالعمولة: ${summary.commissionDzd} DZD\nالمدفوع: ${summary.paidDzd} DZD\nالتعديلات: ${summary.adjustmentsDzd} DZD\nالرصيد المتبقي: ${summary.remainingDzd} DZD\nتاريخ الدفع القادم: ${summary.nextPaymentDate}`, `Your statistics:\nCompleted orders: ${summary.completedOrders}\nCommission: ${summary.commissionDzd} DZD\nPaid: ${summary.paidDzd} DZD\nAdjustments: ${summary.adjustmentsDzd} DZD\nRemaining credit: ${summary.remainingDzd} DZD\nNext payment: ${summary.nextPaymentDate}`));
    } catch { await reply(chatId, textFor(locale, "تعذر عرض الإحصاءات حالياً.", "Statistics are unavailable right now.")); }
    return;
  }

  if (action === "/sync_finance") {
    if (user.role !== "owner") { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try {
      const result = await syncFinanceReporting();
      await audit(identity.userId, "setting", "finance-reporting", "finance_sheet_synchronized", { sales: String(result.sales), tabs: String(result.tabs) });
      await reply(chatId, textFor(locale, `تمت مزامنة التقارير المالية: ${result.sales} مبيعات.`, `Finance reports synchronized: ${result.sales} sales.`));
    } catch { await reply(chatId, textFor(locale, "تعذرت مزامنة التقارير المالية. راجع وصول جدول Google ومعرّفه.", "Finance reporting sync failed. Check the Google sheet ID and editor access.")); }
    return;
  }

  if (action === "/start" || !action) {
    if (user.role === "pending") {
      await reply(chatId, textFor(locale,
        "تم تسجيل طلبك. أرسل معرّف التسجيل التالي للمالك للموافقة عليه:\n" + user.registration_id,
        "Your request is registered. Send this registration ID to the owner for approval:\n" + user.registration_id));
    } else {
      await reply(chatId, textFor(locale,
        "أهلاً بك. الأوامر: /whoami، /ar، /en، /snapchat، /stats" + (user.role === "owner" ? "، /approve TG-XXXXXXXX، /sync_cards، /sync_finance" : ""),
        "Welcome. Commands: /whoami, /ar, /en, /snapchat, /stats" + (user.role === "owner" ? ", /approve TG-XXXXXXXX, /sync_cards, /sync_finance" : "")));
    }
    return;
  }

  await reply(chatId, textFor(locale, "أمر غير معروف. أرسل /start للمساعدة.", "Unknown command. Send /start for help."));
}
