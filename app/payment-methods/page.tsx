import Image from "next/image";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LocalizedText } from "@/components/LocalizedText";
import { getSettings } from "@/lib/admin-store";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "طرق الدفع",
  description: "راجع طرق الدفع اليدوي المتاحة في Tiger Store: BaridiMob وBinance وRedotPay.",
  path: "/payment-methods",
});

const methodMeta = [
  { name: "BaridiMob", logo: "/logos/payments/baridimob.png", helper: { ar: "الدفع عبر تطبيق BaridiMob", en: "Mobile transfer through BaridiMob" } },
  { name: "Binance", logo: "/logos/payments/binance.svg", helper: { ar: "تحويل رقمي عبر Binance", en: "Digital transfer through Binance" } },
  { name: "RedotPay", logo: "/logos/payments/redotpay.svg", helper: { ar: "دفع رقمي", en: "Digital transfer" } },
] as const;

export default async function PaymentMethodsPage() {
  const settings = await getSettings();
  const details: Record<(typeof methodMeta)[number]["name"], string> = {
    BaridiMob: `RIP: ${settings.baridiMobRip}`,
    Binance: settings.ccpDetails || "Payment details will be confirmed after order submission.",
    RedotPay: settings.redotPayDetails || "Payment details will be confirmed after order submission.",
  };

  return <><Header /><main className="store-shell min-h-screen"><section className="mx-auto max-w-[1200px] px-3 py-10 sm:px-5 lg:px-8 lg:py-14"><div className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#C54E00]"><LocalizedText ar="طرق الدفع" en="Payment methods" /></p><h1 className="mt-3 text-3xl font-black text-[var(--text)] sm:text-5xl"><LocalizedText ar="اختر طريقة التحويل المناسبة" en="Choose your transfer method" /></h1><p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-[var(--muted-text)] sm:text-base"><LocalizedText ar="الدفع يدوي فقط. اختر الطريقة المناسبة في إتمام الطلب، ثم ارفع صورة الوصل." en="Payment is manual transfer only. Choose a method at checkout, then upload the receipt image." /></p></div></section><section className="mx-auto max-w-[1200px] px-3 pb-10 sm:px-5 lg:px-8"><div className="grid gap-4 md:grid-cols-3">{methodMeta.map((method) => <article key={method.name} className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] p-5"><span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--page)] p-3"><Image src={method.logo} alt={`${method.name} logo`} width={56} height={56} className="h-full w-full object-contain" /></span><h2 className="mt-5 text-2xl font-black text-[var(--text)]">{method.name}</h2><p className="mt-1 text-sm font-bold text-[#C54E00]"><LocalizedText {...method.helper} /></p><div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--page)] px-4 py-3 text-sm font-bold leading-7 text-[var(--text)]">{details[method.name]}</div></article>)}</div></section></main><Footer /></>;
}
