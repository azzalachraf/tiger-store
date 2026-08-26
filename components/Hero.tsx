"use client";

import Link from "next/link";
import { ArrowUpLeft, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/lib/useLocale";

export function Hero() {
  const { locale } = useLocale();
  const content = locale === "ar"
    ? { eyebrow: "اشتراكات رقمية في الجزائر", title: "اختر خطتك بثقة، وخلي الباقي واضح.", body: "عروض رقمية بخيارات واضحة، دفع تحويل يدوي، ورفع وصل إلزامي قبل بدء المراجعة.", cta: "تصفح المنتجات", note: "التفعيل عادةً خلال 15 دقيقة إلى 12 ساعة بعد تأكيد الدفع." }
    : { eyebrow: "Digital subscriptions in Algeria", title: "Choose your plan with confidence.", body: "Clear digital offers, manual-transfer payment, and a required receipt before review begins.", cta: "Browse products", note: "Activation is usually 15 minutes–12 hours after payment verification." };
  return <section className="hero-shell" aria-label={content.eyebrow}><div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16"><div className="hero-card"><div><p className="section-kicker">{content.eyebrow}</p><h1>{content.title}</h1><p className="hero-copy">{content.body}</p><Link href="/shop" className="hero-action">{content.cta}<ArrowUpLeft className="h-4 w-4" aria-hidden="true" /></Link></div><p className="hero-note"><CheckCircle2 className="h-5 w-5 shrink-0 text-[#C54E00]" aria-hidden="true" />{content.note}</p></div></div></section>;
}
