"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/useLocale";

export function Footer({ disclaimer }: { disclaimer?: string }) {
  const { locale } = useLocale();
  return <footer className="bg-[#17120F] text-[#F3F0EA]"><div className="mx-auto grid max-w-[1440px] gap-8 px-3 py-10 sm:px-5 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8"><div><div className="relative h-14 w-40"><Image src="/logo/tiger-store-ui.png" alt="Tiger Store" fill sizes="160px" className="object-contain object-start" /></div><p className="mt-4 max-w-md text-sm leading-7 text-[#F3F0EA]/75">{t(locale, "footerDescription")}</p><p className="mt-3 max-w-lg text-xs leading-6 text-[#F3F0EA]/55">{disclaimer ?? t(locale, "footerDisclaimer")}</p></div><FooterGroup title={t(locale, "explore")} links={[["/shop", t(locale, "shop")], ["/categories", t(locale, "categories")], ["/payment-methods", t(locale, "paymentMethods")], ["/faq", t(locale, "faq")]]} /><div><h2 className="font-black">{t(locale, "support")}</h2><div className="mt-3 grid gap-2 text-sm text-[#F3F0EA]/75"><Link href="/contact" className="hover:text-[#FF7300]">{t(locale, "contact")}</Link><Link href="/refund-policy" className="hover:text-[#FF7300]">{t(locale, "refundPolicy")}</Link><Link href="/privacy-policy" className="hover:text-[#FF7300]">{locale === "ar" ? "الخصوصية" : "Privacy"}</Link><a href="https://wa.me/213556974593" className="inline-flex items-center gap-2 hover:text-[#FF7300]"><MessageCircle className="h-4 w-4" />WhatsApp</a><a href="https://www.instagram.com/tigerr_store_dz/" target="_blank" rel="noreferrer" className="hover:text-[#FF7300]">Instagram</a></div></div></div><div className="border-t border-[#F3F0EA]/15 px-3 py-4 text-center text-xs text-[#F3F0EA]/55">{t(locale, "copyright")}</div></footer>;
}

function FooterGroup({ title, links }: { title: string; links: [string, string][] }) { return <div><h2 className="font-black">{title}</h2><div className="mt-3 grid gap-2 text-sm text-[#F3F0EA]/75">{links.map(([href, label]) => <Link key={href} href={href} className="hover:text-[#FF7300]">{label}</Link>)}</div></div>; }
