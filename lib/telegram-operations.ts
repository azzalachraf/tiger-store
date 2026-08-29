import "server-only";

import { randomBytes } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { TelegramInterfaceLocale, TelegramRole } from "@/lib/types";
import { advertisingUsdSchema, productSchema, telegramCallbackDataSchema } from "@/lib/validation";
import { cardLabel, cardsForPlan, snapchatCardTypes, type SnapchatCardType, type SnapchatPlanMonths } from "@/lib/snapchat-cards";
import { claimSnapchatCard, clearTelegramRedeemCardUploadSession, finishSnapchatOperation, getTelegramRedeemCardUploadSession, startTelegramRedeemCardUploadSession, syncRedeemInventory, uploadRedeemCardsFromTelegram } from "@/lib/snapchat-operations";
import { parseTelegramRedeemCardLines } from "@/lib/telegram-card-upload";
import { completeSnapchatSale } from "@/lib/telegram-warranty";
import { absoluteUrl } from "@/lib/seo";
import { getAdminFinanceSummary } from "@/lib/finance";
import { syncFinanceReporting } from "@/lib/google-finance-sheet";
import { formatOwnerAnalytics, getOwnerAnalytics, rangeFor, type AnalyticsRange } from "@/lib/owner-analytics";
import { deleteProduct, getProductById, saveProduct } from "@/lib/admin-store";

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

function usdCents(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

function ownerOnly(user: TelegramUserRow) { return user.role === "owner"; }

function commandParts(value: string | undefined) { return (value ?? "").split("|").map((part) => part.trim()); }

function customRange(argument?: string, second?: string): AnalyticsRange | null {
  if (!argument) return rangeFor("today");
  if (argument === "today" || argument === "month") return rangeFor(argument);
  if (!second || !/^\d{4}-\d{2}-\d{2}$/.test(argument) || !/^\d{4}-\d{2}-\d{2}$/.test(second) || argument > second) return null;
  return { start: argument, end: second, label: "custom" };
}

function registrationId() {
  return `TG-${randomBytes(5).toString("hex").toUpperCase().slice(0, 8)}`;
}

type InlineKeyboard = { inline_keyboard: { text: string; callback_data: string }[][] };
type ReplyKeyboard = { keyboard: { text: string }[][]; resize_keyboard: true; is_persistent: true };
type ReplyMarkup = InlineKeyboard | ReplyKeyboard;

function menuKeyboard(locale: TelegramInterfaceLocale, role: TelegramRole): ReplyKeyboard {
  const labels = locale === "ar"
    ? {
        snapchat: "🛒 بيع Snapchat", stats: "📊 إحصاءاتي", owner: "👑 لوحة المالك", profit: "💰 صافي الربح",
        cards: "⬆️ رفع البطاقات", reports: "📈 مزامنة التقارير", ads: "📣 الإعلانات", products: "🛍 المنتجات",
        approval: "👥 إدارة المشرفين", arabic: "🌐 العربية", english: "🌐 English", help: "ℹ️ المساعدة",
      }
    : {
        snapchat: "🛒 Snapchat sale", stats: "📊 My stats", owner: "👑 Owner controls", profit: "💰 Net profit",
        cards: "⬆️ Upload cards", reports: "📈 Sync reports", ads: "📣 Advertising", products: "🛍 Products",
        approval: "👥 Manage admins", arabic: "🌐 العربية", english: "🌐 English", help: "ℹ️ Help",
      };
  const rows = [[labels.snapchat, labels.stats]];
  if (role === "owner") rows.push([labels.owner, labels.profit], [labels.cards, labels.reports], [labels.ads, labels.products], [labels.approval]);
  rows.push([labels.arabic, labels.english], [labels.help]);
  return { keyboard: rows.map((row) => row.map((text) => ({ text }))), resize_keyboard: true, is_persistent: true };
}

function routeMenuButton(value: string | undefined) {
  const text = (value ?? "").trim();
  const commands: Record<string, string> = {
    "🛒 بيع Snapchat": "/snapchat", "🛒 Snapchat sale": "/snapchat",
    "📊 إحصاءاتي": "/stats", "📊 My stats": "/stats",
    "👑 لوحة المالك": "/owner", "👑 Owner controls": "/owner",
    "💰 صافي الربح": "/net_profit today", "💰 Net profit": "/net_profit today",
    "⬆️ رفع البطاقات": "/upload_cards", "⬆️ Upload cards": "/upload_cards",
    "📈 مزامنة التقارير": "/sync_finance", "📈 Sync reports": "/sync_finance",
    "📣 الإعلانات": "/ad_help", "📣 Advertising": "/ad_help",
    "🛍 المنتجات": "/product_help", "🛍 Products": "/product_help",
    "👥 إدارة المشرفين": "/owner", "👥 Manage admins": "/owner",
    "👥 اعتماد مشرف": "/approve_help", "👥 Approve admin": "/approve_help",
    "🌐 العربية": "/ar", "🌐 English": "/en",
    "ℹ️ المساعدة": "/menu", "ℹ️ Help": "/menu",
  };
  return commands[text] ?? text;
}

async function telegramCall(method: string, body: Record<string, unknown>) {
  const token = getServerEnv().TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function reply(chatId: string, text: string, replyMarkup?: ReplyMarkup) {
  await telegramCall("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}

async function answerCallback(id: string) { await telegramCall("answerCallbackQuery", { callback_query_id: id }); }

async function audit(actorTelegramUserId: string, entityType: "telegram_user" | "inventory" | "setting" | "adjustment" | "payment", entityId: string, action: string, metadata: Record<string, string>) {
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

type TelegramAdminRow = {
  telegram_user_id: string | number;
  first_name: string | null;
  username: string | null;
  role: TelegramRole;
  registration_id: string;
};

function operatorName(operator: Pick<TelegramAdminRow, "first_name" | "username">) {
  const firstName = operator.first_name?.trim();
  const username = operator.username?.trim();
  if (firstName && username) return `${firstName} (@${username})`;
  if (firstName) return firstName;
  if (username) return `@${username}`;
  return "Unnamed admin";
}

async function listOperators(role: "admin" | "pending") {
  const { data, error } = await getSupabaseServiceClient().from("telegram_users")
    .select("telegram_user_id, first_name, username, role, registration_id")
    .eq("role", role)
    .order("created_at", { ascending: true })
    .limit(40);
  if (error) throw new Error("Operators could not be read.");
  return (data ?? []) as TelegramAdminRow[];
}

async function findAdmin(adminId: string) {
  const { data, error } = await getSupabaseServiceClient().from("telegram_users")
    .select("telegram_user_id, first_name, username, role, registration_id")
    .eq("telegram_user_id", adminId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Admin unavailable.");
  return data as TelegramAdminRow;
}

async function sendAdminPicker(chatId: string, locale: TelegramInterfaceLocale) {
  const admins = await listOperators("admin");
  if (!admins.length) {
    await reply(chatId, textFor(locale, "لا يوجد مشرفون معتمدون بعد. 👥", "There are no approved admins yet. 👥"));
    return;
  }
  await reply(chatId, textFor(locale, "👥 اختر المشرف لإدارة عمولته ومدفوعاته.", "👥 Choose an admin to manage commission and payments."), {
    inline_keyboard: admins.map((admin) => [{ text: `👤 ${operatorName(admin)}`.slice(0, 60), callback_data: `adm|${admin.telegram_user_id}|open` }]),
  });
}

async function sendPendingPicker(chatId: string, locale: TelegramInterfaceLocale) {
  const pending = await listOperators("pending");
  if (!pending.length) {
    await reply(chatId, textFor(locale, "✅ لا توجد طلبات اعتماد معلقة.", "✅ There are no pending approval requests."));
    return;
  }
  await reply(chatId, textFor(locale, "✅ اختر الشخص الذي تريد اعتماده كمشرف.", "✅ Choose the person to approve as an admin."), {
    inline_keyboard: pending.map((candidate) => [{ text: `✅ ${operatorName(candidate)}`.slice(0, 60), callback_data: `apr|${candidate.telegram_user_id}` }]),
  });
}

async function sendAdminOverview(chatId: string, locale: TelegramInterfaceLocale, adminId: string) {
  const admin = await findAdmin(adminId);
  const summary = await getAdminFinanceSummary(adminId);
  await reply(chatId, textFor(locale,
    `👤 ${operatorName(admin)}\n📦 الطلبات المكتملة: ${summary.completedOrders}\n💰 العمولة: ${summary.commissionDzd} DZD\n➕/➖ التعديلات: ${summary.adjustmentsDzd} DZD\n💸 المدفوع: ${summary.paidDzd} DZD\n🧾 الرصيد: ${summary.remainingDzd} DZD\n📅 الدفع القادم: ${summary.nextPaymentDate}`,
    `👤 ${operatorName(admin)}\n📦 Completed orders: ${summary.completedOrders}\n💰 Commission: ${summary.commissionDzd} DZD\n➕/➖ Adjustments: ${summary.adjustmentsDzd} DZD\n💸 Paid: ${summary.paidDzd} DZD\n🧾 Remaining credit: ${summary.remainingDzd} DZD\n📅 Next payment: ${summary.nextPaymentDate}`), {
    inline_keyboard: [
      [{ text: textFor(locale, "➕➖ تعديل العمولة", "➕➖ Adjust commission"), callback_data: `adm|${adminId}|adjust` }],
      [{ text: textFor(locale, "💸 تسجيل دفعة", "💸 Record payment"), callback_data: `adm|${adminId}|pay` }],
      [{ text: textFor(locale, "👥 رجوع للمشرفين", "👥 Back to admins"), callback_data: "own|admins" }],
    ],
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
  const parsed = telegramCallbackDataSchema.safeParse(parts.map((part, index) => parts[0] === "sc" && index === 1 && /^\d+$/.test(part) ? Number(part) : part));
  if (!parsed.success) { await reply(String(input.chatId), textFor(locale, "انتهت صلاحية هذا الاختيار.", "This selection has expired.")); return; }
  const selected = parsed.data;
  if (selected[0] === "an") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try { await reply(String(input.chatId), formatOwnerAnalytics(locale, await getOwnerAnalytics(rangeFor(selected[1])))); } catch { await reply(String(input.chatId), textFor(locale, "تعذر إعداد التقرير حالياً.", "The report is unavailable right now.")); }
    return;
  }
  if (selected[0] === "up") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const cardType = selected[1];
    await startTelegramRedeemCardUploadSession(identity.userId, cardType);
    await audit(identity.userId, "inventory", cardType, "redeem_card_upload_started", { cardType });
    await reply(String(input.chatId), textFor(locale,
      `جاهز لرفع بطاقات ${cardLabel(cardType, locale)}. ألصق الآن من 1 إلى 100 كود، كود واحد في كل سطر.`,
      `Ready to upload ${cardLabel(cardType, locale)} cards. Paste 1–100 codes now, one code per line.`));
    return;
  }
  if (selected[0] === "own") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try {
      if (selected[1] === "admins") await sendAdminPicker(String(input.chatId), locale);
      else await sendPendingPicker(String(input.chatId), locale);
    } catch {
      await reply(String(input.chatId), textFor(locale, "تعذر تحميل قائمة المشرفين حالياً.", "The admin list is unavailable right now."));
    }
    return;
  }
  if (selected[0] === "apr") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const candidateId = selected[1];
    const { data: candidate, error } = await getSupabaseServiceClient().from("telegram_users")
      .select("telegram_user_id, first_name, username, role, registration_id")
      .eq("telegram_user_id", candidateId)
      .eq("role", "pending")
      .maybeSingle();
    if (error || !candidate) { await reply(String(input.chatId), textFor(locale, "هذا الطلب غير متاح أو تمت معالجته. ⚠️", "This request is unavailable or already handled. ⚠️")); return; }
    const { error: updateError } = await getSupabaseServiceClient().from("telegram_users").update({
      role: "admin",
      approved_by_telegram_user_id: identity.userId,
      approved_at: new Date().toISOString(),
    }).eq("telegram_user_id", candidateId).eq("role", "pending");
    if (updateError) { await reply(String(input.chatId), textFor(locale, "تعذرت الموافقة حالياً. ⚠️", "Approval could not be saved. ⚠️")); return; }
    await audit(identity.userId, "telegram_user", candidateId, "admin_approved", { role: "admin" });
    await reply(String(input.chatId), textFor(locale, `✅ تمت الموافقة على ${operatorName(candidate as TelegramAdminRow)}.`, `✅ ${operatorName(candidate as TelegramAdminRow)} is now an admin.`));
    return;
  }
  if (selected[0] === "adm") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const adminId = selected[1];
    try {
      if (selected[2] === "open") await sendAdminOverview(String(input.chatId), locale, adminId);
      if (selected[2] === "adjust") {
        const admin = await findAdmin(adminId);
        await reply(String(input.chatId), textFor(locale, `➕➖ ${operatorName(admin)}\nاختر مقدار الزيادة أو العقوبة.`, `➕➖ ${operatorName(admin)}\nChoose a credit increase or penalty.`), {
          inline_keyboard: [
            [{ text: "➕ 10 DZD", callback_data: `adj|${adminId}|p10` }, { text: "➕ 50 DZD", callback_data: `adj|${adminId}|p50` }, { text: "➕ 100 DZD", callback_data: `adj|${adminId}|p100` }],
            [{ text: "➖ 10 DZD", callback_data: `adj|${adminId}|m10` }, { text: "➖ 50 DZD", callback_data: `adj|${adminId}|m50` }, { text: "➖ 100 DZD", callback_data: `adj|${adminId}|m100` }],
            [{ text: textFor(locale, "↩️ رجوع", "↩️ Back"), callback_data: `adm|${adminId}|open` }],
          ],
        });
      }
      if (selected[2] === "pay") {
        const admin = await findAdmin(adminId);
        const summary = await getAdminFinanceSummary(adminId);
        await reply(String(input.chatId), textFor(locale, `💸 ${operatorName(admin)}\nالرصيد الحالي: ${summary.remainingDzd} DZD\nاختر الدفعة.`, `💸 ${operatorName(admin)}\nCurrent credit: ${summary.remainingDzd} DZD\nChoose a payment.`), {
          inline_keyboard: [
            [{ text: "💸 50 DZD", callback_data: `pay|${adminId}|50` }, { text: "💸 100 DZD", callback_data: `pay|${adminId}|100` }, { text: "💸 500 DZD", callback_data: `pay|${adminId}|500` }],
            [{ text: textFor(locale, "✅ دفع كل الرصيد", "✅ Mark full balance paid"), callback_data: `pay|${adminId}|full` }],
            [{ text: textFor(locale, "↩️ رجوع", "↩️ Back"), callback_data: `adm|${adminId}|open` }],
          ],
        });
      }
    } catch {
      await reply(String(input.chatId), textFor(locale, "هذا المشرف غير متاح حالياً. ⚠️", "This admin is unavailable right now. ⚠️"));
    }
    return;
  }
  if (selected[0] === "adj") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const adminId = selected[1];
    const values = { p10: 10, p50: 50, p100: 100, m10: -10, m50: -50, m100: -100 } as const;
    const amount = values[selected[2]];
    try {
      await findAdmin(adminId);
      const { error } = await getSupabaseServiceClient().from("financial_adjustments").insert({
        recipient_telegram_user_id: adminId,
        amount_dzd: amount,
        reason: amount > 0 ? "Owner commission credit adjustment." : "Owner penalty adjustment.",
        created_by_telegram_user_id: identity.userId,
      });
      if (error) throw error;
      await audit(identity.userId, "adjustment", adminId, amount > 0 ? "admin_credit_added" : "admin_penalty_applied", { amountDzd: String(amount) });
      await reply(String(input.chatId), textFor(locale, `✅ تم تسجيل ${amount > 0 ? "زيادة" : "عقوبة"} بقيمة ${Math.abs(amount)} DZD.`, `✅ ${amount > 0 ? "Credit" : "Penalty"} of ${Math.abs(amount)} DZD recorded.`));
      await sendAdminOverview(String(input.chatId), locale, adminId);
    } catch {
      await reply(String(input.chatId), textFor(locale, "تعذر حفظ التعديل. ⚠️", "The adjustment could not be saved. ⚠️"));
    }
    return;
  }
  if (selected[0] === "pay") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const adminId = selected[1];
    try {
      await findAdmin(adminId);
      const summary = await getAdminFinanceSummary(adminId);
      const amount = selected[2] === "full" ? summary.remainingDzd : Number(selected[2]);
      if (!Number.isInteger(amount) || amount < 1 || amount > summary.remainingDzd) {
        await reply(String(input.chatId), textFor(locale, "لا يمكن أن تتجاوز الدفعة الرصيد المتبقي. ⚠️", "A payment cannot exceed the remaining credit. ⚠️"));
        return;
      }
      const { error } = await getSupabaseServiceClient().from("admin_payments").insert({
        admin_telegram_user_id: adminId,
        amount_dzd: amount,
        recorded_by_telegram_user_id: identity.userId,
        note: "Recorded by owner from Telegram.",
      });
      if (error) throw error;
      await audit(identity.userId, "payment", adminId, "admin_payment_recorded", { amountDzd: String(amount) });
      await reply(String(input.chatId), textFor(locale, `✅ تم تسجيل دفعة ${amount} DZD.`, `✅ Payment of ${amount} DZD recorded.`));
      await sendAdminOverview(String(input.chatId), locale, adminId);
    } catch {
      await reply(String(input.chatId), textFor(locale, "تعذر تسجيل الدفعة. ⚠️", "The payment could not be recorded. ⚠️"));
    }
    return;
  }
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
  const rawText = (input.text ?? "").trim();
  const routedText = routeMenuButton(input.text);
  const chatId = telegramId(input.chatId);
  if (ownerOnly(user) && rawText && !rawText.startsWith("/") && routedText === rawText) {
    const cardType = await getTelegramRedeemCardUploadSession(identity.userId);
    if (cardType) {
      try {
        const codes = parseTelegramRedeemCardLines(cardType, rawText);
        const result = await uploadRedeemCardsFromTelegram(cardType, codes);
        await clearTelegramRedeemCardUploadSession(identity.userId);
        await audit(identity.userId, "inventory", cardType, "redeem_cards_uploaded_from_telegram", { added: String(result.added), duplicates: String(result.duplicates) });
        await reply(chatId, textFor(locale,
          `تمت إضافة ${result.added} بطاقة من نوع ${cardLabel(cardType, locale)}.${result.duplicates ? ` تم تجاهل ${result.duplicates} مكرر.` : ""}`,
          `${result.added} ${cardLabel(cardType, locale)} cards were added.${result.duplicates ? ` ${result.duplicates} duplicate(s) were skipped.` : ""}`));
        await notifyLowStock(result.counts, identity.userId);
      } catch {
        await reply(chatId, textFor(locale,
          "تعذر رفع البطاقات. ألصق من 1 إلى 100 كود صالح، كل كود في سطر، ومن دون تكرار.",
          "Cards could not be uploaded. Paste 1–100 valid, non-duplicate codes, one code per line."));
      }
      return;
    }
  }
  const [rawCommand = "", argument, secondArgument] = command(routedText);
  const action = rawCommand.toLowerCase().split("@")[0];

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

  if (action === "/menu") {
    if (user.role === "pending") {
      await reply(chatId, textFor(locale,
        "طلبك بانتظار موافقة المالك. أرسل معرّف التسجيل التالي للمالك فقط:\n" + user.registration_id,
        "Your request is waiting for the owner's approval. Send this registration ID only to the owner:\n" + user.registration_id));
      return;
    }
    await reply(chatId, textFor(locale,
      "اختر أي زر من القائمة. كل العمليات الحساسة تبقى محمية بصلاحيتك في Telegram.",
      "Choose a button below. Every sensitive action remains protected by your Telegram role."), menuKeyboard(locale, user.role));
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
    const env = getServerEnv();
    if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      await reply(chatId, textFor(locale,
        "لم يتم ربط Google Sheet بعد. أضف حساب الخدمة ومفتاحه في Vercel، ثم شارك معه الجدول بصلاحية Viewer قبل المزامنة.",
        "Google Sheet is not connected yet. Add the service account and its key in Vercel, then share the sheet with it as Viewer before syncing."));
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

  if (action === "/upload_cards") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    await reply(chatId, textFor(locale, "اختر نوع البطاقة ثم ألصق الأكواد، كود واحد في كل سطر.", "Choose the card type, then paste the codes one per line."), {
      inline_keyboard: snapchatCardTypes.map((cardType) => [{ text: cardLabel(cardType, locale), callback_data: `up|${cardType}` }]),
    });
    return;
  }

  if (action === "/net_profit") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const range = customRange(argument, secondArgument);
    if (!range) { await reply(chatId, textFor(locale, "استعمل: /net_profit today أو /net_profit month أو /net_profit YYYY-MM-DD YYYY-MM-DD", "Use: /net_profit today, /net_profit month, or /net_profit YYYY-MM-DD YYYY-MM-DD")); return; }
    try { await reply(chatId, formatOwnerAnalytics(locale, await getOwnerAnalytics(range))); } catch { await reply(chatId, textFor(locale, "تعذر إعداد التقرير حالياً.", "The report is unavailable right now.")); }
    return;
  }

  if (action === "/owner") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    await reply(chatId, textFor(locale,
      "👑 لوحة المالك\nاختر ما تريد إدارته. لا تحتاج لكتابة أوامر للمشرفين أو العمولة أو المدفوعات.",
      "👑 Owner controls\nChoose what to manage. No commands are needed for admins, commission, or payments."), {
      inline_keyboard: [
        [{ text: textFor(locale, "👥 إدارة المشرفين", "👥 Manage admins"), callback_data: "own|admins" }],
        [{ text: textFor(locale, "✅ طلبات الاعتماد", "✅ Pending approvals"), callback_data: "own|pending" }],
        [{ text: textFor(locale, "💰 ربح اليوم", "💰 Today net profit"), callback_data: "an|today" }, { text: textFor(locale, "📈 ربح الشهر", "📈 Month net profit"), callback_data: "an|month" }],
      ],
    });
    return;
  }

  if (action === "/approve_help") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    await sendPendingPicker(chatId, locale);
    return;
  }

  if (action === "/ad_help") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    await reply(chatId, textFor(locale,
      "الإعلانات: أضف إنفاقاً هكذا:\n/ad_add 2026-08-29|instagram|12.50|اسم الحملة|ملاحظة\nلعرض يوم محدد: /ad_list 2026-08-29",
      "Advertising: add spend with:\n/ad_add 2026-08-29|instagram|12.50|campaign name|note\nTo view a day: /ad_list 2026-08-29"), menuKeyboard(locale, user.role));
    return;
  }

  if (action === "/product_help") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    await reply(chatId, textFor(locale,
      "إدارة المنتجات الكاملة متاحة في لوحة الموقع المحمية. الأوامر المتقدمة هنا تقبل فقط JSON كامل ومطابق للنموذج: /product_create أو /product_edit أو /product_delete <id>.",
      "Full product management is available in the protected site admin panel. Advanced commands here accept only complete validated JSON: /product_create, /product_edit, or /product_delete <id>."), menuKeyboard(locale, user.role));
    return;
  }

  if (action === "/ad_add" || action === "/ad_edit") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const payload = commandParts((input.text ?? "").replace(/^\/ad_(?:add|edit)\s*/i, ""));
    const id = action === "/ad_edit" ? payload.shift() : undefined;
    const parsedSpend = advertisingUsdSchema.safeParse({ date: payload[0], sourceId: payload[1], amountUsd: payload[2], campaign: payload[3] ?? "", note: payload[4] ?? "" });
    if (!parsedSpend.success || (action === "/ad_edit" && !id)) { await reply(chatId, textFor(locale, "استعمل: /ad_add 2026-08-29|instagram|12.50|الحملة|ملاحظة", "Use: /ad_add 2026-08-29|instagram|12.50|campaign|note")); return; }
    try {
      const settings = await (await import("@/lib/finance")).getFinanceSettings();
      const inputSpend = parsedSpend.data;
      const row = { spend_date: inputSpend.date, source_id: inputSpend.sourceId, platform: inputSpend.sourceId === "instagram" ? "instagram" : "other", amount_usd_cents: usdCents(inputSpend.amountUsd), amount_dzd: Math.floor(usdCents(inputSpend.amountUsd) * settings.usdDzdRate / 100), campaign: inputSpend.campaign, note: inputSpend.note, recorded_by_telegram_user_id: identity.userId };
      const query = id ? getSupabaseServiceClient().from("advertising_spend").update(row).eq("id", id) : getSupabaseServiceClient().from("advertising_spend").insert(row);
      const { error } = await query;
      if (error) throw error;
      await audit(identity.userId, "setting", id ?? inputSpend.date, id ? "advertising_spend_edited" : "advertising_spend_added", { date: inputSpend.date, source: inputSpend.sourceId });
      await reply(chatId, textFor(locale, "تم حفظ الإنفاق الإعلاني بالدولار.", "Advertising spend was saved in USD."));
    } catch { await reply(chatId, textFor(locale, "تعذر حفظ الإنفاق الإعلاني.", "Advertising spend could not be saved.")); }
    return;
  }

  if (action === "/ad_delete") {
    if (!ownerOnly(user) || !argument) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية أو المعرف غير موجود.", "Not authorised or missing ID.")); return; }
    const { error } = await getSupabaseServiceClient().from("advertising_spend").delete().eq("id", argument);
    if (error) { await reply(chatId, textFor(locale, "تعذر حذف الإنفاق.", "Advertising spend could not be deleted.")); return; }
    await audit(identity.userId, "setting", argument, "advertising_spend_deleted", {}); await reply(chatId, textFor(locale, "تم الحذف.", "Deleted.")); return;
  }

  if (action === "/ad_list") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const date = argument && /^\d{4}-\d{2}-\d{2}$/.test(argument) ? argument : rangeFor("today").start;
    const { data } = await getSupabaseServiceClient().from("advertising_spend").select("id, source_id, amount_usd_cents, campaign").eq("spend_date", date).order("created_at");
    await reply(chatId, (data?.length ?? 0) ? data!.map((row) => `${row.id} | ${row.source_id} | $${(Number(row.amount_usd_cents) / 100).toFixed(2)} | ${row.campaign}`).join("\n") : textFor(locale, "لا يوجد إنفاق مسجل لهذا اليوم.", "No advertising spend is recorded for this day.")); return;
  }

  if (action === "/product_create" || action === "/product_edit") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const json = (input.text ?? "").replace(/^\/product_(?:create|edit)\s*/i, "").trim();
    try {
      const product = productSchema.parse(JSON.parse(json));
      if (action === "/product_edit" && !await getProductById(product.id)) throw new Error("Missing product");
      await saveProduct(product);
      await audit(identity.userId, "setting", product.id, action === "/product_create" ? "product_created" : "product_edited", { slug: product.slug });
      await reply(chatId, textFor(locale, "تم حفظ المنتج بكامل الترجمات والخطط والصورة والتفاصيل والأسئلة.", "The complete product was saved: translations, plans, image, details, and FAQs."));
    } catch { await reply(chatId, textFor(locale, "تعذر حفظ المنتج. أرسل JSON كامل مطابق لنموذج المنتج، مع image وdetails وfaqs.", "Product could not be saved. Send complete product JSON with image, details, and FAQs.")); }
    return;
  }

  if (action === "/product_delete") {
    if (!ownerOnly(user) || !argument) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية أو المعرف غير موجود.", "Not authorised or missing ID.")); return; }
    try { await deleteProduct(argument); await audit(identity.userId, "setting", argument, "product_deleted", {}); await reply(chatId, textFor(locale, "تم حذف المنتج.", "Product deleted.")); } catch { await reply(chatId, textFor(locale, "تعذر حذف المنتج.", "Product could not be deleted.")); }
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
        "أهلاً بك في عمليات Tiger Store. استعمل الأزرار أسفل الرسالة.",
        "Welcome to Tiger Store operations. Use the buttons below."), menuKeyboard(locale, user.role));
    }
    return;
  }

  await reply(chatId, textFor(locale, "أمر غير معروف. أرسل /start للمساعدة.", "Unknown command. Send /start for help."));
}

export async function sendOwnerDailyReport(now = new Date()) {
  if (!getServerEnv().TELEGRAM_BOT_TOKEN) throw new Error("Telegram is not configured.");
  const client = getSupabaseServiceClient();
  const reportRange = rangeFor("yesterday", now);
  const { data: existing } = await client.from("daily_owner_reports").select("report_date").eq("report_date", reportRange.start).maybeSingle();
  if (existing) return { sent: false, reason: "already_sent" as const };
  const { data: owner } = await client.from("telegram_users").select("telegram_user_id, interface_locale").eq("role", "owner").maybeSingle();
  if (!owner) throw new Error("Owner is not registered.");
  const report = await getOwnerAnalytics(reportRange);
  const { error } = await client.from("daily_owner_reports").insert({ report_date: reportRange.start, summary: report });
  if (error) { if (error.code === "23505") return { sent: false, reason: "already_sent" as const }; throw new Error("Daily report could not be recorded."); }
  await reply(String(owner.telegram_user_id), formatOwnerAnalytics(owner.interface_locale as TelegramInterfaceLocale, report));
  return { sent: true, reason: "sent" as const };
}
