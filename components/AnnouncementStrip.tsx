"use client";

import { CreditCard, Headphones, ShieldCheck, Zap } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/useLocale";

export function AnnouncementStrip() {
  const { locale } = useLocale();
  const messages = [[Zap, t(locale, "digitalSubscriptions")], [CreditCard, t(locale, "securePayment")], [Zap, t(locale, "activationMessage")], [Headphones, t(locale, "whatsappSupport")], [ShieldCheck, t(locale, "selectedWarranty")]] as const;
  const row = (hidden = false) => <div aria-hidden={hidden || undefined} className="announcement-row">{messages.map(([Icon, label], index) => <span key={`${label}-${index}`} className="announcement-item"><Icon className="h-3.5 w-3.5 text-[#FF7300]" aria-hidden="true" />{label}</span>)}</div>;
  return <section className="announcement-strip" dir={locale === "ar" ? "rtl" : "ltr"} aria-label={t(locale, "digitalSubscriptions")}><div className="announcement-track">{row()}{row(true)}</div></section>;
}
