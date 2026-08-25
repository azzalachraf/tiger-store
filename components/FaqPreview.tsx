"use client";

import Link from "next/link";
import { useLocale } from "@/lib/useLocale";

const faqContent = {
  ar: {
    eyebrow: "الأسئلة الشائعة",
    title: "إجابات سريعة قبل الطلب",
    viewAll: "عرض الكل",
    items: [
      ["كيف أستلم الاشتراك؟", "بعد إرسال الطلب نتابع معك عبر واتساب ونرسل طريقة التفعيل حسب المنتج والخطة المختارة."],
      ["كم يستغرق التفعيل؟", "غالبا يكون التفعيل سريعا، وقد يختلف الوقت حسب توفر المنتج ونوع الاشتراك."],
      ["هل أدفع داخل الموقع؟", "لا. الموقع يستقبل الطلب فقط، ثم نراجع التفاصيل ونرسل لك معلومات الدفع المناسبة."],
    ],
  },
  en: {
    eyebrow: "FAQ",
    title: "Quick answers before ordering",
    viewAll: "View all",
    items: [
      ["How do I receive the subscription?", "After submitting the order, we continue on WhatsApp and send activation details for the selected plan."],
      ["How long does activation take?", "Activation is usually fast, but timing depends on product availability and subscription type."],
      ["Do I pay inside the website?", "No. The website collects the order only, then we review it and send the right payment details."],
    ],
  },
};

export function FaqPreview() {
  const { locale } = useLocale();
  const content = faqContent[locale === "fr" ? "en" : locale];

  return (
    <section id="faq" className="mx-auto max-w-[1440px] px-3 py-7 sm:px-5 lg:px-8" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-tiger-gold">{content.eyebrow}</p>
          <h2 className="mt-1 text-2xl font-black text-white">{content.title}</h2>
        </div>
        <Link href="/faq" className="shrink-0 text-sm font-black text-tiger-gold transition-colors duration-150 hover:text-white">
          {content.viewAll}
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {content.items.map(([question, answer]) => (
          <article key={question} className="premium-card rounded-md p-5">
            <h3 className="font-black text-white">{question}</h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-white/62">{answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
