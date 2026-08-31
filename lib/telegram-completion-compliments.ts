import type { TelegramInterfaceLocale } from "@/lib/types";

export type TelegramAdminGender = "male" | "female";

type ComplimentSet = Record<TelegramInterfaceLocale, Record<TelegramAdminGender | "neutral", readonly string[]>>;

/**
 * These are deliberately short, work-focused messages. A completed order gets
 * exactly one private acknowledgement, never a batch of messages.
 */
export const completionCompliments: ComplimentSet = {
  ar: {
    male: [
      "👏 أحسنت يا بطل، تم إكمال الطلب بنجاح.",
      "⭐ شغل ممتاز يا بطل، شكراً على إتمام الطلب.",
      "🏆 أداء رائع يا بطل، الطلب أصبح مكتملاً.",
      "💪 ممتاز يا بطل، أكملت الطلب باحتراف.",
      "🎯 أحسنت يا بطل، خطوة ممتازة للعميل.",
      "✨ عمل جميل يا بطل، تم تسجيل الإكمال.",
      "🔥 برافو يا بطل، أنهيت الطلب بنجاح.",
      "🌟 شغل مرتب يا بطل، الطلب مكتمل الآن.",
      "✅ رائع يا بطل، شكراً على المتابعة السريعة.",
      "🚀 أحسنت يا بطل، تم إنهاء عملية جديدة بنجاح.",
    ],
    female: [
      "👏 أحسنتِ يا بطلة، تم إكمال الطلب بنجاح.",
      "⭐ شغل ممتاز يا بطلة، شكراً على إتمام الطلب.",
      "🏆 أداء رائع يا بطلة، الطلب أصبح مكتملاً.",
      "💪 ممتاز يا بطلة، أكملتِ الطلب باحتراف.",
      "🎯 أحسنتِ يا بطلة، خطوة ممتازة للعميل.",
      "✨ عمل جميل يا بطلة، تم تسجيل الإكمال.",
      "🔥 برافو يا بطلة، أنهيتِ الطلب بنجاح.",
      "🌟 شغل مرتب يا بطلة، الطلب مكتمل الآن.",
      "✅ رائع يا بطلة، شكراً على المتابعة السريعة.",
      "🚀 أحسنتِ يا بطلة، تم إنهاء عملية جديدة بنجاح.",
    ],
    neutral: ["✅ تم إكمال الطلب بنجاح. شكراً على العمل الممتاز."],
  },
  en: {
    male: [
      "👏 Great work — this order is complete.",
      "⭐ Excellent job. Thank you for completing the order.",
      "🏆 Strong work — the order is now complete.",
      "💪 Nicely done. You completed this professionally.",
      "🎯 Great job — a clear next step for the customer.",
      "✨ Well done. Completion has been recorded.",
      "🔥 Brilliant work — the order is finished.",
      "🌟 Clean work. This order is complete now.",
      "✅ Great follow-through. Thank you for the quick completion.",
      "🚀 Well done — another order completed successfully.",
    ],
    female: [
      "👏 Great work — this order is complete.",
      "⭐ Excellent job. Thank you for completing the order.",
      "🏆 Strong work — the order is now complete.",
      "💪 Nicely done. You completed this professionally.",
      "🎯 Great job — a clear next step for the customer.",
      "✨ Well done. Completion has been recorded.",
      "🔥 Brilliant work — the order is finished.",
      "🌟 Clean work. This order is complete now.",
      "✅ Great follow-through. Thank you for the quick completion.",
      "🚀 Well done — another order completed successfully.",
    ],
    neutral: ["✅ Order completed successfully. Thank you for the great work."],
  },
};

export function getCompletionCompliment(
  locale: TelegramInterfaceLocale,
  gender: TelegramAdminGender | null | undefined,
  random: () => number = Math.random,
) {
  const messages = completionCompliments[locale][gender ?? "neutral"];
  return messages[Math.min(messages.length - 1, Math.floor(random() * messages.length))];
}
