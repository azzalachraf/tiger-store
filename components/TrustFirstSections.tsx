"use client";

import Link from "next/link";
import { CheckCircle2, CreditCard, FileImage, Headphones, PackageCheck, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/useLocale";

const copy = {
  ar: {
    processEyebrow: "كيف يتم الطلب", processTitle: "خطوات واضحة من الاختيار إلى التفعيل", processDescription: "لا يوجد دفع إلكتروني داخل الموقع. راجع التفاصيل وارفع وصل التحويل في الطلب.", paymentLink: "اطّلع على طرق الدفع",
    steps: [["1", "اختر المنتج والخطة", "اطّلع على ما يشمله العرض والسعر النهائي حسب الخطة."], ["2", "حوّل المبلغ وارفع الوصل", "استخدم BaridiMob أو Binance أو RedotPay ثم أرفق صورة الوصل."], ["3", "نراجع ونفعّل الطلب", "يكون التفعيل عادةً خلال 15 دقيقة إلى 12 ساعة بعد تأكيد الدفع."]],
    trustEyebrow: "قبل أن تطلب", trustTitle: "ما نلتزم به بوضوح", trust: [["دعم ومتابعة", "نوضح لك المعلومات المطلوبة ونبقى متاحين لمتابعة الطلب."], ["ضمان حسب العرض", "مدة الضمان المعروضة في صفحة المنتج أو الخطة هي المرجع."], ["حل عادل عند خطأ من طرفنا", "نحاول الاستبدال أولاً، ثم نرد الجزء غير المستعمل من مدة الضمان إذا تعذّر ذلك."], ["استرجاع محسوب", "يُحسب الاسترجاع بالدينار الصحيح حسب الأيام المتبقية من التغطية. المشاكل الناتجة عن العميل غير مشمولة."]],
  },
  en: {
    processEyebrow: "How ordering works", processTitle: "Clear steps from selection to activation", processDescription: "There is no online payment inside the site. Review the details and upload your transfer receipt with the order.", paymentLink: "View payment methods",
    steps: [["1", "Choose product and plan", "Review what the offer includes and the final price for the selected plan."], ["2", "Transfer and upload receipt", "Use BaridiMob, Binance, or RedotPay, then attach a receipt screenshot."], ["3", "We review and activate", "Activation is usually 15 minutes–12 hours after payment verification."]],
    trustEyebrow: "Before you order", trustTitle: "What we state clearly", trust: [["Support and follow-up", "We explain the required information and remain available to follow up on the order."], ["Warranty per offer", "The warranty shown on the product or plan is the reference."], ["Fair resolution for our error", "We attempt replacement first; if impossible, we refund the unused covered period proportionally."], ["Calculated refund", "Refunds use whole DZD and remaining covered days. Customer-caused problems are excluded."]],
  },
} as const;

const stepIcons = [PackageCheck, FileImage, CheckCircle2];
const trustIcons = [Headphones, ShieldCheck, PackageCheck, CreditCard];

export function OrderProcess() {
  const { locale } = useLocale(); const content = copy[locale === "ar" ? "ar" : "en"];
  return <section className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 lg:px-8"><div className="trust-section"><p className="section-kicker">{content.processEyebrow}</p><h2 className="section-title">{content.processTitle}</h2><p className="section-copy">{content.processDescription}</p><ol className="process-grid">{content.steps.map(([number, title, body], index) => { const Icon = stepIcons[index]; return <li key={number} className="process-card"><span className="process-number">{number}</span><Icon className="h-5 w-5 text-[#C54E00]" aria-hidden="true" /><h3>{title}</h3><p>{body}</p></li>; })}</ol><Link href="/payment-methods" className="trust-link">{content.paymentLink}</Link></div></section>;
}

export function TrustCommitments() {
  const { locale } = useLocale(); const content = copy[locale === "ar" ? "ar" : "en"];
  return <section className="mx-auto max-w-[1180px] px-4 pb-12 sm:px-6 lg:px-8"><div className="trust-section trust-section--quiet"><p className="section-kicker">{content.trustEyebrow}</p><h2 className="section-title">{content.trustTitle}</h2><div className="trust-grid">{content.trust.map(([title, body], index) => { const Icon = trustIcons[index]; return <article key={title} className="trust-card"><Icon className="h-5 w-5 text-[#C54E00]" aria-hidden="true" /><h3>{title}</h3><p>{body}</p></article>; })}</div></div></section>;
}

export type VerifiedSocialProof = { deliveredOrders?: number; testimonials?: Array<{ name: string; quote: string }> };
export function SocialProof({ data }: { data?: VerifiedSocialProof }) { if (!data?.deliveredOrders && !data?.testimonials?.length) return null; return null; }
