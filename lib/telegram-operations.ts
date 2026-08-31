import "server-only";

import { randomBytes } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { TelegramInterfaceLocale, TelegramRole } from "@/lib/types";
import { advertisingUsdSchema, productSchema, telegramCallbackDataSchema } from "@/lib/validation";
import { cardLabel, cardsForPlan, snapchatCardTypes, type SnapchatCardType, type SnapchatPlanMonths } from "@/lib/snapchat-cards";
import { claimSnapchatCard, clearAvailableRedeemCards, clearTelegramRedeemCardUploadSession, finishSnapchatOperation, getPrivateRedeemCards, getTelegramRedeemCardUploadSession, restoreManuallyUsedRedeemCard, returnReservedRedeemCardToStock, startTelegramRedeemCardUploadSession, syncRedeemInventory, uploadRedeemCardsFromTelegram } from "@/lib/snapchat-operations";
import { parseTelegramRedeemCardLines } from "@/lib/telegram-card-upload";
import { completeSnapchatSale } from "@/lib/telegram-warranty";
import { absoluteUrl } from "@/lib/seo";
import { getAdminCycleStatistics, getAdminFinanceSummary, getFinanceSettings } from "@/lib/finance";
import { formatOwnerAnalytics, getOwnerAnalytics, rangeFor, type AnalyticsRange } from "@/lib/owner-analytics";
import { deleteProduct, getOrderById, getOrders, getProductById, getProductBySlug, saveProduct } from "@/lib/admin-store";
import { issueOrderWarrantyLink } from "@/lib/order-warranty";
import { createDirectWarrantyLink } from "@/lib/warranty";
import { clearCustomCommissionInput, getAdminCompensation, saveAdminCompensation, startCustomCommissionInput, takeCustomCommissionInput } from "@/lib/admin-compensation";

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
function canOperate(user: TelegramUserRow) { return user.role === "owner" || user.role === "admin"; }

function commandParts(value: string | undefined) { return (value ?? "").split("|").map((part) => part.trim()); }

function customRange(argument?: string, second?: string): AnalyticsRange | null {
  if (!argument) return null;
  if (argument === "today" || argument === "yesterday" || argument === "7d" || argument === "30d" || argument === "month") return rangeFor(argument);
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
        cards: "⬆️ رفع البطاقات", websiteOrders: "📋 طلبات الموقع", externalOrder: "📝 طلب خارجي", cardStock: "📦 مخزون البطاقات",
        approval: "👥 إدارة المشرفين", arabic: "🌐 العربية", english: "🌐 English",
      }
    : {
        snapchat: "🛒 Snapchat sale", stats: "📊 My stats", owner: "👑 Owner controls", profit: "💰 Net profit",
        cards: "⬆️ Upload cards", websiteOrders: "📋 Website orders", externalOrder: "📝 External order", cardStock: "📦 Card stock",
        approval: "👥 Manage admins", arabic: "🌐 العربية", english: "🌐 English",
      };
  const rows = [[labels.snapchat, labels.stats]];
  if (role === "owner") rows.push([labels.owner, labels.profit], [labels.cards], [labels.approval]);
  if (role === "owner" || role === "admin") rows.push([labels.websiteOrders, labels.externalOrder], [labels.cardStock]);
  rows.push([labels.arabic, labels.english]);
  return { keyboard: rows.map((row) => row.map((text) => ({ text }))), resize_keyboard: true, is_persistent: true };
}

function routeMenuButton(value: string | undefined) {
  const text = (value ?? "").trim();
  const commands: Record<string, string> = {
    "🛒 بيع Snapchat": "/snapchat", "🛒 Snapchat sale": "/snapchat",
    "📊 إحصاءاتي": "/stats", "📊 My stats": "/stats",
    "👑 لوحة المالك": "/owner", "👑 Owner controls": "/owner",
    "💰 صافي الربح": "/net_profit", "💰 Net profit": "/net_profit",
    "⬆️ رفع البطاقات": "/upload_cards", "⬆️ Upload cards": "/upload_cards",
    "👥 إدارة المشرفين": "/owner", "👥 Manage admins": "/owner",
    "👥 اعتماد مشرف": "/approve_help", "👥 Approve admin": "/approve_help",
    "📋 طلبات الموقع": "/website_orders", "📋 Website orders": "/website_orders",
    "📝 طلب خارجي": "/external_order", "📝 External order": "/external_order",
    "📦 مخزون البطاقات": "/card_stock", "📦 Card stock": "/card_stock",
    "🌐 العربية": "/ar", "🌐 English": "/en",
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
  const startsWithEmoji = /^[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(text);
  await telegramCall("sendMessage", { chat_id: chatId, text: startsWithEmoji ? text : `🐯 ${text}`, disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}

async function answerCallback(id: string) { await telegramCall("answerCallbackQuery", { callback_query_id: id }); }

async function audit(actorTelegramUserId: string, entityType: "telegram_user" | "inventory" | "setting" | "adjustment" | "payment" | "commission" | "order", entityId: string, action: string, metadata: Record<string, string>) {
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

async function sendCardUploadPicker(chatId: string, locale: TelegramInterfaceLocale) {
  await reply(chatId, textFor(locale, "اختر نوع البطاقة ثم ألصق الأكواد، كود واحد في كل سطر.", "Choose the card type, then paste the codes one per line."), {
    inline_keyboard: snapchatCardTypes.map((cardType) => [{ text: cardLabel(cardType, locale), callback_data: `up|${cardType}` }]),
  });
}

async function getAvailableCardCounts() {
  const { data, error } = await getSupabaseServiceClient()
    .from("redeem_cards")
    .select("card_type")
    .eq("status", "available")
    .eq("source_available", true);
  if (error) throw new Error("Card stock could not be read.");
  const counts = new Map<SnapchatCardType, number>();
  for (const cardType of snapchatCardTypes) counts.set(cardType, 0);
  for (const row of data ?? []) {
    const cardType = row.card_type as SnapchatCardType;
    counts.set(cardType, (counts.get(cardType) ?? 0) + 1);
  }
  return counts;
}

async function sendCardStock(chatId: string, locale: TelegramInterfaceLocale, canClear = false) {
  const counts = await getAvailableCardCounts();
  const stock = snapchatCardTypes.map((cardType) => `${cardLabel(cardType, locale)}: ${counts.get(cardType) ?? 0}`).join("\n");
  await reply(chatId, textFor(locale, `📦 مخزون البطاقات المتاح\n${stock}`, `📦 Available card inventory\n${stock}`), canClear ? {
    inline_keyboard: snapchatCardTypes.flatMap((cardType) => [[
      { text: textFor(locale, `🗑️ تنظيف ${cardLabel(cardType, locale)}`, `🗑️ Clear ${cardLabel(cardType, locale)}`), callback_data: `cs|${cardType}` },
      { text: textFor(locale, `👁️ عرض ${cardLabel(cardType, locale)}`, `👁️ View ${cardLabel(cardType, locale)}`), callback_data: `cv|${cardType}` },
    ]]).concat([[{ text: textFor(locale, "💵 قيمة المخزون", "💵 Stock value"), callback_data: "sv" }]]),
  } : undefined);
}

function usd(valueInCents: number) {
  return `$${(valueInCents / 100).toFixed(2)}`;
}

async function sendStockValue(chatId: string, locale: TelegramInterfaceLocale) {
  const [counts, settings] = await Promise.all([getAvailableCardCounts(), getFinanceSettings()]);
  let totalCents = 0;
  const lines = snapchatCardTypes.map((cardType) => {
    const count = counts.get(cardType) ?? 0;
    const unitCents = settings.cardCostsUsdCents[cardType];
    const subtotalCents = count * unitCents;
    totalCents += subtotalCents;
    return `${cardLabel(cardType, locale)}: ${count} × ${usd(unitCents)} = ${usd(subtotalCents)}`;
  });
  await reply(chatId, textFor(locale,
    `💵 قيمة مخزون البطاقات\n${lines.join("\n")}\n\nالإجمالي: ${usd(totalCents)}`,
    `💵 Card stock value\n${lines.join("\n")}\n\nTotal: ${usd(totalCents)}`));
}

async function sendOwnerCardCodes(chatId: string, locale: TelegramInterfaceLocale, cardType: SnapchatCardType) {
  const cards = await getPrivateRedeemCards(cardType);
  if (!cards.length) { await reply(chatId, textFor(locale, "لا توجد بطاقات من هذا النوع.", "There are no cards of this type.")); return; }
  const statusLabel = (status: "available" | "reserved" | "consumed" | "disabled") => status === "available" ? "🟢" : status === "reserved" ? "🟡" : status === "consumed" ? "🔴" : "⚪";
  const messages: string[] = [];
  let current = `👁️ ${cardLabel(cardType, locale)}\n`;
  for (const card of cards) {
    const line = `${statusLabel(card.status)} ${card.code}\n`;
    if (current.length + line.length > 3500) { messages.push(current); current = `👁️ ${cardLabel(cardType, locale)}\n`; }
    current += line;
  }
  if (current.trim()) messages.push(current);
  for (const message of messages) await reply(chatId, message);
  const restorable = cards.filter((card) => card.canRestore).slice(0, 20);
  if (restorable.length) await reply(chatId, textFor(locale, "↩️ البطاقات المستعملة يدوياً فقط يمكن إرجاعها:", "↩️ Only manually used cards can be restored:"), {
    inline_keyboard: restorable.map((card) => [{ text: `↩️ ${card.code.slice(-8)}`, callback_data: `ru|${card.id}` }]),
  });
}

function websiteOrderLabel(order: Awaited<ReturnType<typeof getOrders>>[number]) {
  const item = order.products[0];
  const customer = order.customerName.trim() || "Customer";
  return `📋 ${customer} — ${item?.name ?? "Order"}`.slice(0, 60);
}

async function sendPendingWebsiteOrderPicker(chatId: string, locale: TelegramInterfaceLocale) {
  const orders = (await getOrders()).filter((order) => order.status === "pending" && order.products.length > 0).slice(0, 30);
  if (!orders.length) {
    await reply(chatId, textFor(locale, "📋 لا توجد طلبات موقع معلقة حالياً.", "📋 There are no pending website orders."));
    return;
  }
  await reply(chatId, textFor(locale, "📋 اختر طلب الموقع لإصدار رابط الضمان وتسليمه.", "📋 Choose a website order to mark delivered and issue its warranty link."), {
    inline_keyboard: orders.map((order) => [{ text: websiteOrderLabel(order), callback_data: `wo|${order.id}` }]),
  });
}

async function sendWebsiteOrderItemPicker(chatId: string, locale: TelegramInterfaceLocale, orderId: string) {
  const order = await getOrderById(orderId);
  if (!order || order.status !== "pending" || !order.products.length) {
    await reply(chatId, textFor(locale, "هذا الطلب لم يعد معلقاً أو غير متاح.", "This order is no longer pending or available."));
    return;
  }
  await reply(chatId, textFor(locale, "🛡️ اختر المنتج. لطلبات Snapchat ستختار البطاقة أولاً، ثم يُسلَّم الطلب ويصدر رابط الضمان.", "🛡️ Choose the product. Snapchat orders continue with card selection before the order is delivered and the warranty link is issued."), {
    inline_keyboard: order.products.map((item, itemIndex) => [{ text: `🛡️ ${item.name} — ${item.option}`.slice(0, 60), callback_data: `wi|${order.id}|${itemIndex}` }]),
  });
}

function websiteSnapchatPlan(item: { slug?: string; option?: string; optionId?: string; duration?: string }): SnapchatPlanMonths | null {
  if (item.slug !== "snapchat-plus") return null;
  const match = `${item.optionId ?? ""} ${item.option ?? ""} ${item.duration ?? ""}`.match(/(?:^|\D)(1|2|3|6|12)(?:\D|$)/);
  const plan = match ? Number(match[1]) : 0;
  return [1, 2, 3, 6, 12].includes(plan) ? plan as SnapchatPlanMonths : null;
}

async function sendWebsiteCardPicker(chatId: string, locale: TelegramInterfaceLocale, orderId: string, itemIndex: number) {
  const order = await getOrderById(orderId);
  const item = order?.products[itemIndex];
  const plan = item ? websiteSnapchatPlan(item) : null;
  if (!order || order.status !== "pending" || !item || !plan) {
    await reply(chatId, textFor(locale, "هذا الخيار غير متاح لعملية Snapchat حالياً.", "This item is not available for a Snapchat operation."));
    return;
  }
  await reply(chatId, textFor(locale, `🛒 ${planLabel(plan, locale)}\nاختر نوع البطاقة لإكمال طلب الموقع.`, `🛒 ${planLabel(plan, locale)}\nChoose the card type to continue this website order.`), {
    inline_keyboard: cardsForPlan(plan).map((cardType) => [{ text: cardLabel(cardType, locale), callback_data: `wc|${orderId}|${itemIndex}|${plan}|${cardType}` }]),
  });
}

async function sendExternalOrderPlans(chatId: string, locale: TelegramInterfaceLocale) {
  const plans: SnapchatPlanMonths[] = [1, 2, 3, 6, 12];
  await reply(chatId, textFor(locale, "📝 اختر مدة اشتراك Snapchat Plus الذي تم تسليمه من مصدر آخر.", "📝 Choose the Snapchat Plus plan delivered from another source."), {
    inline_keyboard: plans.map((plan) => [{ text: planLabel(plan, locale), callback_data: `ex|${plan}` }]),
  });
}

async function createExternalWarrantyLink(plan: SnapchatPlanMonths) {
  const product = await getProductBySlug("snapchat-plus");
  const offer = product?.priceOptions?.find((option) => new RegExp(`(^|\\D)${plan}(\\D|$)`).test(`${option.id} ${option.label} ${option.duration}`));
  if (!product || !offer) throw new Error("Snapchat plan unavailable.");
  return createDirectWarrantyLink({
    slug: product.slug,
    optionId: offer.id,
    coveredDays: plan * 30,
    amountPaid: offer.price,
    paymentMethod: "External",
  });
}

async function sendExternalOrderConfirmation(chatId: string, locale: TelegramInterfaceLocale, plan: SnapchatPlanMonths) {
  await reply(chatId, textFor(locale,
    `✅ هل تم تسليم اشتراك Snapchat Plus لمدة ${planLabel(plan, locale)} من مصدر آخر؟\nبعد التأكيد، ستحصل على رابط الضمان للعميل.`,
    `✅ Was the ${planLabel(plan, locale)} Snapchat Plus subscription delivered from another source?\nAfter confirmation, you will receive the customer's warranty link.`), {
    inline_keyboard: [[{ text: textFor(locale, "✅ نعم، إصدار رابط الضمان", "✅ Yes, issue warranty link"), callback_data: `ex|${plan}|confirm` }]],
  });
}

async function sendNetProfitPicker(chatId: string, locale: TelegramInterfaceLocale) {
  await reply(chatId, textFor(locale, "📈 اختر الفترة لعرض صافي الربح.", "📈 Choose a period for net profit."), {
    inline_keyboard: [
      [{ text: textFor(locale, "📅 اليوم", "📅 Today"), callback_data: "an|today" }, { text: textFor(locale, "🕘 أمس", "🕘 Yesterday"), callback_data: "an|yesterday" }],
      [{ text: textFor(locale, "🗓 آخر 7 أيام", "🗓 Last 7 days"), callback_data: "an|7d" }, { text: textFor(locale, "📆 آخر 30 يومًا", "📆 Last 30 days"), callback_data: "an|30d" }],
    ],
  });
}

async function sendAdminOverview(chatId: string, locale: TelegramInterfaceLocale, adminId: string) {
  const admin = await findAdmin(adminId);
  const [summary, compensation] = await Promise.all([getAdminFinanceSummary(adminId), getAdminCompensation(adminId)]);
  const compensationLabel = compensation.mode === "salary"
    ? textFor(locale, "راتب — 0 DA لكل طلب", "Salary — 0 DA per order")
    : textFor(locale, `عمولة — ${compensation.commissionDzd} DA لكل طلب`, `Commission — ${compensation.commissionDzd} DA per order`);
  await reply(chatId, textFor(locale,
    `👤 ${operatorName(admin)}\n💼 ${compensationLabel}\nالطلبات المكتملة: ${summary.completedOrders}\nالعمولة: ${summary.commissionDzd} DA\nالتعديلات: ${summary.adjustmentsDzd} DA\nالمدفوع: ${summary.paidDzd} DA\nالرصيد: ${summary.remainingDzd} DA\nالدفع القادم: ${summary.nextPaymentDate}`,
    `👤 ${operatorName(admin)}\n💼 ${compensationLabel}\nCompleted orders: ${summary.completedOrders}\nCommission earned: ${summary.commissionDzd} DA\nAdjustments: ${summary.adjustmentsDzd} DA\nPaid: ${summary.paidDzd} DA\nRemaining credit: ${summary.remainingDzd} DA\nNext payment: ${summary.nextPaymentDate}`), {
    inline_keyboard: [
      [{ text: textFor(locale, "💼 الراتب أو العمولة", "💼 Salary or commission"), callback_data: `adm|${adminId}|compensation` }],
      [{ text: textFor(locale, "➕➖ إضافة راتب أو تعديل", "➕➖ Add salary or adjustment"), callback_data: `adm|${adminId}|adjust` }],
      [{ text: textFor(locale, "💸 تسجيل دفعة", "💸 Record payment"), callback_data: `adm|${adminId}|pay` }],
      [{ text: textFor(locale, "👥 رجوع للمشرفين", "👥 Back to admins"), callback_data: "own|admins" }],
    ],
  });
}

async function sendCompensationPicker(chatId: string, locale: TelegramInterfaceLocale, adminId: string) {
  const admin = await findAdmin(adminId);
  await reply(chatId, textFor(locale,
    `💼 ${operatorName(admin)}\nاختر طريقة التعويض. الراتب لا يخصم أي عمولة من صافي الربح لكل طلب.`,
    `💼 ${operatorName(admin)}\nChoose compensation. Salary does not deduct any per-order commission from net profit.`), {
    inline_keyboard: [
      [{ text: textFor(locale, "💼 راتب (0 DA لكل طلب)", "💼 Salary (0 DA per order)"), callback_data: `cmp|${adminId}|salary|0` }],
      [{ text: "💳 50 DA", callback_data: `cmp|${adminId}|commission|50` }, { text: "💳 100 DA", callback_data: `cmp|${adminId}|commission|100` }, { text: "💳 150 DA", callback_data: `cmp|${adminId}|commission|150` }],
      [{ text: "💳 200 DA", callback_data: `cmp|${adminId}|commission|200` }, { text: "💳 300 DA", callback_data: `cmp|${adminId}|commission|300` }, { text: "💳 500 DA", callback_data: `cmp|${adminId}|commission|500` }],
      [{ text: textFor(locale, "✏️ مبلغ آخر", "✏️ Custom amount"), callback_data: `cmp|${adminId}|custom|0` }],
      [{ text: textFor(locale, "↩️ رجوع", "↩️ Back"), callback_data: `adm|${adminId}|open` }],
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
  const parsed = telegramCallbackDataSchema.safeParse(parts.map((part, index) => {
    const numericPlan = (parts[0] === "sc" && index === 1) || (parts[0] === "wc" && index === 3) || (parts[0] === "ex" && index === 1);
    return numericPlan && /^\d+$/.test(part) ? Number(part) : part;
  }));
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
  if (selected[0] === "cs") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try {
      const counts = await getAvailableCardCounts();
      const available = counts.get(selected[1]) ?? 0;
      await reply(String(input.chatId), textFor(locale,
        `⚠️ سيتم حذف ${available} بطاقة متاحة من نوع ${cardLabel(selected[1], locale)} فقط. البطاقات المحجوزة أو المستعملة لن تتأثر.`,
        `⚠️ This deletes only ${available} available ${cardLabel(selected[1], locale)} card(s). Reserved and used cards stay protected.`), {
        inline_keyboard: [[{ text: textFor(locale, "🗑️ تأكيد الحذف", "🗑️ Confirm clear"), callback_data: `cc|${selected[1]}|confirm` }]],
      });
    } catch { await reply(String(input.chatId), textFor(locale, "تعذر تحميل المخزون حالياً.", "Card stock is unavailable right now.")); }
    return;
  }
  if (selected[0] === "cc") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try {
      const result = await clearAvailableRedeemCards(selected[1]);
      await audit(identity.userId, "inventory", selected[1], "available_redeem_cards_cleared", { deleted: String(result.deleted) });
      await reply(String(input.chatId), textFor(locale,
        `✅ تم حذف ${result.deleted} بطاقة متاحة من ${cardLabel(selected[1], locale)}.`,
        `✅ Cleared ${result.deleted} available ${cardLabel(selected[1], locale)} card(s).`));
      await sendCardStock(String(input.chatId), locale, true);
    } catch { await reply(String(input.chatId), textFor(locale, "تعذر حذف البطاقات المتاحة.", "Available cards could not be cleared.")); }
    return;
  }
  if (selected[0] === "cv") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try { await sendOwnerCardCodes(String(input.chatId), locale, selected[1]); } catch { await reply(String(input.chatId), textFor(locale, "تعذر عرض البطاقات حالياً.", "Card codes are unavailable right now.")); }
    return;
  }
  if (selected[0] === "ru") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try {
      await restoreManuallyUsedRedeemCard(selected[1]);
      await audit(identity.userId, "inventory", selected[1], "manually_used_redeem_card_restored", {});
      await reply(String(input.chatId), textFor(locale, "✅ أعيدت البطاقة اليدوية إلى المخزون المتاح.", "✅ The manually used card was restored to available stock."));
    } catch { await reply(String(input.chatId), textFor(locale, "لا يمكن إرجاع هذه البطاقة؛ قد تكون مستخدمة في عملية مكتملة.", "This card cannot be restored; it may belong to a completed operation.")); }
    return;
  }
  if (selected[0] === "sv") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try { await sendStockValue(String(input.chatId), locale); } catch { await reply(String(input.chatId), textFor(locale, "تعذر حساب قيمة المخزون حالياً.", "Stock value is unavailable right now.")); }
    return;
  }
  if (selected[0] === "own") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try {
      if (selected[1] === "admins") await sendAdminPicker(String(input.chatId), locale);
      else if (selected[1] === "pending") await sendPendingPicker(String(input.chatId), locale);
      else if (selected[1] === "upload") await sendCardUploadPicker(String(input.chatId), locale);
      else if (selected[1] === "orders") await sendPendingWebsiteOrderPicker(String(input.chatId), locale);
      else if (selected[1] === "external") await sendExternalOrderPlans(String(input.chatId), locale);
      else await sendCardStock(String(input.chatId), locale, true);
    } catch {
      await reply(String(input.chatId), textFor(locale, "تعذر تحميل قائمة المشرفين حالياً.", "The admin list is unavailable right now."));
    }
    return;
  }
  if (selected[0] === "ops") {
    if (!canOperate(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try {
      if (selected[1] === "orders") await sendPendingWebsiteOrderPicker(String(input.chatId), locale);
      else if (selected[1] === "external") await sendExternalOrderPlans(String(input.chatId), locale);
      else await sendCardStock(String(input.chatId), locale, ownerOnly(user));
    } catch { await reply(String(input.chatId), textFor(locale, "تعذر تحميل هذه العملية حالياً.", "This operation could not be loaded right now.")); }
    return;
  }
  if (selected[0] === "wo") {
    if (!canOperate(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try { await sendWebsiteOrderItemPicker(String(input.chatId), locale, selected[1]); } catch { await reply(String(input.chatId), textFor(locale, "تعذر تحميل الطلب حالياً.", "The order could not be loaded right now.")); }
    return;
  }
  if (selected[0] === "wi") {
    if (!canOperate(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    try {
      const order = await getOrderById(selected[1]);
      const item = order?.products[Number(selected[2])];
      if (item && websiteSnapchatPlan(item)) await sendWebsiteCardPicker(String(input.chatId), locale, selected[1], Number(selected[2]));
      else {
        const token = await issueOrderWarrantyLink({ orderId: selected[1], itemIndex: Number(selected[2]), coveredDays: 365, markDelivered: true });
        await audit(identity.userId, "order", selected[1], "website_order_delivered_with_warranty", { itemIndex: selected[2] });
        await reply(String(input.chatId), textFor(locale, "✅ تم تسليم الطلب. رابط الضمان في الرسالة التالية.", "✅ The order is delivered. The warranty link is in the next message."));
        await reply(String(input.chatId), absoluteUrl(`/warranty/${token}`));
      }
    } catch { await reply(String(input.chatId), textFor(locale, "تعذر إصدار رابط الضمان لهذا الطلب.", "A warranty link could not be issued for this order.")); }
    return;
  }
  if (selected[0] === "wc") {
    if (!canOperate(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const [, orderId, itemIndex, plan, cardType] = selected;
    try {
      const operation = await claimSnapchatCard(identity.userId, plan, cardType);
      await reply(String(input.chatId), textFor(locale, "✅ تم حجز البطاقة. رابط التفعيل في الرسالة التالية.", "✅ Card reserved. The activation link is in the next message."), { inline_keyboard: [[
        { text: textFor(locale, "✅ إكمال طلب الموقع", "✅ Complete website order"), callback_data: `wp|${operation.operationId}|${orderId}|${itemIndex}|complete` },
        { text: textFor(locale, "❌ إلغاء", "❌ Cancel"), callback_data: `wp|${operation.operationId}|${orderId}|${itemIndex}|cancel` },
      ]] });
      await reply(String(input.chatId), `https://apps.apple.com/redeem?code=${encodeURIComponent(operation.code)}`);
    } catch { await reply(String(input.chatId), textFor(locale, "لا يوجد كود متاح لهذا النوع حالياً.", "No code is currently available for this card type.")); }
    return;
  }
  if (selected[0] === "wp") {
    if (!canOperate(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const [, operationId, orderId, itemIndex, outcome] = selected;
    try {
      if (outcome === "cancel") {
        await finishSnapchatOperation(operationId, identity.userId, "cancelled");
        await reply(String(input.chatId), textFor(locale, "❌ أُلغيت العملية وأُعيدت البطاقة للمخزون.", "❌ Operation cancelled and the card was returned to stock."));
      } else {
        await finishSnapchatOperation(operationId, identity.userId, "completed");
        const token = await issueOrderWarrantyLink({ orderId, itemIndex: Number(itemIndex), coveredDays: 365, markDelivered: true });
        await audit(identity.userId, "order", orderId, "website_snapchat_order_completed_with_card", { itemIndex, operationId });
        await reply(String(input.chatId), textFor(locale, "✅ اكتمل طلب الموقع. رابط الضمان في الرسالة التالية.", "✅ Website order completed. The warranty link is in the next message."));
        await reply(String(input.chatId), absoluteUrl(`/warranty/${token}`));
      }
    } catch { await reply(String(input.chatId), textFor(locale, "تعذر إكمال عملية طلب الموقع. تحقق من حالة الطلب والبطاقة.", "The website order could not be completed. Check the order and card status.")); }
    return;
  }
  if (selected[0] === "ex") {
    if (!canOperate(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    if (selected.length === 2) { await sendExternalOrderConfirmation(String(input.chatId), locale, selected[1]); return; }
    try {
      const token = await createExternalWarrantyLink(selected[1]);
      await audit(identity.userId, "order", `external-snapchat-${selected[1]}`, "external_completed_order_warranty_link_created", { plan: String(selected[1]) });
      await reply(String(input.chatId), textFor(locale, "✅ رابط البيع الخارجي جاهز. بعد أن يكمل العميل نموذج الضمان، يُحفظ الطلب كطلب مُسلَّم. الرابط في الرسالة التالية.", "✅ The external-sale link is ready. Once the customer completes the warranty form, the delivered order is saved. The link is in the next message."));
      await reply(String(input.chatId), absoluteUrl(`/warranty/${token}`));
    } catch { await reply(String(input.chatId), textFor(locale, "تعذر إنشاء رابط الضمان لهذه الخطة.", "A warranty link could not be created for this plan.")); }
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
    await saveAdminCompensation({ adminId: candidateId, updatedByTelegramUserId: identity.userId, mode: "salary", commissionDzd: 0 });
    await audit(identity.userId, "telegram_user", candidateId, "admin_approved", { role: "admin" });
    await reply(String(input.chatId), textFor(locale, `✅ تمت الموافقة على ${operatorName(candidate as TelegramAdminRow)}. اختر الآن راتباً أو عمولة.`, `✅ ${operatorName(candidate as TelegramAdminRow)} is now an admin. Choose salary or commission now.`));
    await sendCompensationPicker(String(input.chatId), locale, candidateId);
    return;
  }
  if (selected[0] === "adm") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const adminId = selected[1];
    try {
      if (selected[2] === "open") await sendAdminOverview(String(input.chatId), locale, adminId);
      if (selected[2] === "compensation") await sendCompensationPicker(String(input.chatId), locale, adminId);
      if (selected[2] === "adjust") {
        const admin = await findAdmin(adminId);
        await reply(String(input.chatId), textFor(locale, `➕➖ ${operatorName(admin)}\nأضف راتباً أو مكافأة، أو اختر عقوبة.`, `➕➖ ${operatorName(admin)}\nAdd salary or a bonus, or choose a penalty.`), {
          inline_keyboard: [
            [{ text: "➕ 10 DA", callback_data: `adj|${adminId}|p10` }, { text: "➕ 50 DA", callback_data: `adj|${adminId}|p50` }, { text: "➕ 100 DA", callback_data: `adj|${adminId}|p100` }],
            [{ text: "➖ 10 DA", callback_data: `adj|${adminId}|m10` }, { text: "➖ 50 DA", callback_data: `adj|${adminId}|m50` }, { text: "➖ 100 DA", callback_data: `adj|${adminId}|m100` }],
            [{ text: textFor(locale, "↩️ رجوع", "↩️ Back"), callback_data: `adm|${adminId}|open` }],
          ],
        });
      }
      if (selected[2] === "pay") {
        const admin = await findAdmin(adminId);
        const summary = await getAdminFinanceSummary(adminId);
        await reply(String(input.chatId), textFor(locale, `💸 ${operatorName(admin)}\nالرصيد الحالي: ${summary.remainingDzd} DA\nاختر الدفعة.`, `💸 ${operatorName(admin)}\nCurrent credit: ${summary.remainingDzd} DA\nChoose a payment.`), {
          inline_keyboard: [
            [{ text: "💸 50 DA", callback_data: `pay|${adminId}|50` }, { text: "💸 100 DA", callback_data: `pay|${adminId}|100` }, { text: "💸 500 DA", callback_data: `pay|${adminId}|500` }],
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
  if (selected[0] === "cmp") {
    if (!ownerOnly(user)) { await reply(String(input.chatId), textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const [, adminId, mode, amountText] = selected;
    try {
      await findAdmin(adminId);
      if (mode === "custom") {
        await startCustomCommissionInput(identity.userId, adminId);
        await reply(String(input.chatId), textFor(locale, "✏️ أرسل الآن مبلغ العمولة لكل طلب مكتمل بالـ DA فقط، مثل: 60", "✏️ Send the commission amount per completed order in DA only, for example: 60"));
        return;
      }
      const commissionDzd = mode === "salary" ? 0 : Number(amountText);
      const compensation = await saveAdminCompensation({ adminId, updatedByTelegramUserId: identity.userId, mode, commissionDzd });
      await audit(identity.userId, "commission", adminId, "admin_compensation_updated", { mode: compensation.mode, commissionDzd: String(compensation.commissionDzd) });
      await reply(String(input.chatId), compensation.mode === "salary"
        ? textFor(locale, "✅ تم ضبطه على راتب: لا توجد عمولة لكل طلب.", "✅ Set to salary: there is no per-order commission.")
        : textFor(locale, `✅ تم ضبط العمولة على ${compensation.commissionDzd} DA لكل طلب مكتمل.`, `✅ Commission set to ${compensation.commissionDzd} DA per completed order.`));
      await sendAdminOverview(String(input.chatId), locale, adminId);
    } catch { await reply(String(input.chatId), textFor(locale, "تعذر حفظ إعداد التعويض لهذا المشرف.", "The compensation setting could not be saved for this admin.")); }
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
      await reply(String(input.chatId), textFor(locale, `✅ تم تسجيل ${amount > 0 ? "زيادة" : "عقوبة"} بقيمة ${Math.abs(amount)} DA.`, `✅ ${amount > 0 ? "Credit" : "Penalty"} of ${Math.abs(amount)} DA recorded.`));
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
        settles_cycle: selected[2] === "full",
      });
      if (error) throw error;
      await audit(identity.userId, "payment", adminId, "admin_payment_recorded", { amountDzd: String(amount) });
      await reply(String(input.chatId), textFor(locale, `✅ تم تسجيل دفعة ${amount} DA.`, `✅ Payment of ${amount} DA recorded.`));
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
      const activationLink = `https://apps.apple.com/redeem?code=${encodeURIComponent(operation.code)}`;
      await reply(String(input.chatId), textFor(locale, "✅ تم إنشاء العملية. رابط التفعيل في الرسالة التالية.", "✅ Operation created. Your activation link is in the next message."), { inline_keyboard: [[
        { text: textFor(locale, "✅ إكمال", "✅ Complete"), callback_data: `op|${operation.operationId}|complete` },
        { text: textFor(locale, "❌ إلغاء", "❌ Cancel"), callback_data: `op|${operation.operationId}|cancel` },
      ]] });
      await reply(String(input.chatId), activationLink);
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
    const pendingCommissionAdminId = await takeCustomCommissionInput(identity.userId);
    if (pendingCommissionAdminId) {
      const amount = /^\d+$/.test(rawText) ? Number(rawText) : Number.NaN;
      if (!Number.isInteger(amount) || amount < 0 || amount > 100_000) {
        await reply(chatId, textFor(locale, "أرسل مبلغاً صحيحاً بالـ DA فقط، مثل: 60", "Send a valid DA amount only, for example: 60"));
        return;
      }
      try {
        const compensation = await saveAdminCompensation({ adminId: pendingCommissionAdminId, updatedByTelegramUserId: identity.userId, mode: amount === 0 ? "salary" : "commission", commissionDzd: amount });
        await clearCustomCommissionInput(identity.userId);
        await audit(identity.userId, "commission", pendingCommissionAdminId, "admin_compensation_updated", { mode: compensation.mode, commissionDzd: String(compensation.commissionDzd) });
        await reply(chatId, compensation.mode === "salary"
          ? textFor(locale, "✅ تم ضبطه على راتب: لا توجد عمولة لكل طلب.", "✅ Set to salary: there is no per-order commission.")
          : textFor(locale, `✅ تم ضبط العمولة على ${compensation.commissionDzd} DA لكل طلب مكتمل.`, `✅ Commission set to ${compensation.commissionDzd} DA per completed order.`));
        await sendAdminOverview(chatId, locale, pendingCommissionAdminId);
      } catch { await reply(chatId, textFor(locale, "تعذر حفظ مبلغ العمولة.", "The commission amount could not be saved.")); }
      return;
    }
    const cardType = await getTelegramRedeemCardUploadSession(identity.userId);
    if (cardType) {
      try {
        const codes = parseTelegramRedeemCardLines(cardType, rawText);
        const result = await uploadRedeemCardsFromTelegram(cardType, codes);
        await clearTelegramRedeemCardUploadSession(identity.userId);
        await audit(identity.userId, "inventory", cardType, "redeem_cards_uploaded_from_telegram", { added: String(result.added), restored: String(result.restored), duplicates: String(result.duplicates) });
        await reply(chatId, textFor(locale,
          `تمت إضافة ${result.added} بطاقة من نوع ${cardLabel(cardType, locale)}.${result.restored ? ` وأُعيدت ${result.restored} بطاقة مستعملة يدوياً إلى المخزون.` : ""}${result.duplicates ? ` تم تجاهل ${result.duplicates} مكرر.` : ""}`,
          `${result.added} ${cardLabel(cardType, locale)} cards were added.${result.restored ? ` ${result.restored} manually used card(s) were restored to stock.` : ""}${result.duplicates ? ` ${result.duplicates} duplicate(s) were skipped.` : ""}`));
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
    await saveAdminCompensation({ adminId: candidateId, updatedByTelegramUserId: identity.userId, mode: "salary", commissionDzd: 0 });
    await audit(identity.userId, "telegram_user", candidateId, "admin_approved", { role: "admin" });
    await reply(chatId, textFor(locale, "تمت الموافقة. اختر الآن راتباً أو عمولة.", "Approved. Choose salary or commission now."));
    await sendCompensationPicker(chatId, locale, candidateId);
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

  if (action === "/website_orders" || action === "/external_order" || action === "/card_stock") {
    if (!canOperate(user)) {
      await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised."));
      return;
    }
    try {
      if (action === "/website_orders") await sendPendingWebsiteOrderPicker(chatId, locale);
      else if (action === "/external_order") await sendExternalOrderPlans(chatId, locale);
      else await sendCardStock(chatId, locale, ownerOnly(user));
    } catch {
      await reply(chatId, textFor(locale, "تعذر تحميل هذه العملية حالياً.", "This operation could not be loaded right now."));
    }
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

  if (action === "/return_card") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    const redeemCode = (input.text ?? "").replace(/^\/return_card\s*/i, "").trim();
    if (!redeemCode) { await reply(chatId, textFor(locale, "استعمل: /return_card ثم الصق رابط أو كود البطاقة المحجوزة.", "Use /return_card followed by the reserved card link or code.")); return; }
    try {
      const restored = await returnReservedRedeemCardToStock(redeemCode);
      await audit(identity.userId, "inventory", restored.cardId, "reserved_redeem_card_returned", { cardType: restored.cardType, operationId: restored.operationId });
      await reply(chatId, textFor(locale, "✅ أُلغيت العملية وأُعيدت البطاقة المحجوزة للمخزون.", "✅ The operation was cancelled and the reserved card was returned to stock."));
    } catch {
      await reply(chatId, textFor(locale, "لا يمكن إرجاع هذه البطاقة. يجب أن تكون محجوزة في عملية نشطة؛ البطاقات المكتملة لا تُعاد للمخزون.", "This card cannot be returned. It must be reserved in an active operation; completed cards are not returned to stock."));
    }
    return;
  }

  if (action === "/upload_cards") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    await sendCardUploadPicker(chatId, locale);
    return;
  }

  if (action === "/net_profit") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    if (!argument) { await sendNetProfitPicker(chatId, locale); return; }
    const range = customRange(argument, secondArgument);
    if (!range) { await sendNetProfitPicker(chatId, locale); return; }
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
        [{ text: textFor(locale, "⬆️ رفع البطاقات", "⬆️ Upload cards"), callback_data: "own|upload" }, { text: textFor(locale, "📦 مخزون البطاقات", "📦 Card stock"), callback_data: "own|stock" }],
        [{ text: textFor(locale, "📋 طلبات الموقع", "📋 Website orders"), callback_data: "own|orders" }],
        [{ text: textFor(locale, "📝 طلب خارجي مكتمل", "📝 Completed external order"), callback_data: "own|external" }],
      ],
    });
    return;
  }

  if (action === "/approve_help") {
    if (!ownerOnly(user)) { await reply(chatId, textFor(locale, "غير مصرح لك بهذه العملية.", "Not authorised.")); return; }
    await sendPendingPicker(chatId, locale);
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
      const summary = await getAdminCycleStatistics(identity.userId);
      await reply(chatId, textFor(locale,
        `📊 إحصاءاتك\n📦 الطلبات المكتملة: ${summary.completedOrders}\n💳 الرصيد المكتسب: ${summary.creditDzd} DA`,
        `📊 My statistics\n📦 Completed orders: ${summary.completedOrders}\n💳 Credit earned: ${summary.creditDzd} DA`));
    } catch { await reply(chatId, textFor(locale, "تعذر عرض الإحصاءات حالياً.", "Statistics are unavailable right now.")); }
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
