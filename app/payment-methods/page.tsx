import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LocalizedText } from "@/components/LocalizedText";
import { getSettings } from "@/lib/admin-store";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Payment Methods",
  description: "Review Tiger Store payment methods: BaridiMob, CCP, and RedotPay for digital subscription orders.",
  path: "/payment-methods",
});

const methodMeta = [
  {
    name: "BaridiMob",
    logo: "/logos/payments/baridimob.png",
    helper: "Mobile payment / الدفع عبر التطبيق",
  },
  {
    name: "CCP",
    logo: "/logos/payments/algerie-poste.svg",
    helper: "Algérie Poste / بريد الجزائر",
  },
  {
    name: "RedotPay",
    logo: "/logos/payments/redotpay.svg",
    helper: "Digital payment / دفع رقمي",
  },
];

export default async function PaymentMethodsPage() {
  const settings = await getSettings();

  const details: Record<string, string> = {
    BaridiMob: `RIP: ${settings.baridiMobRip}`,
    CCP: settings.ccpDetails || "Payment details will be confirmed after order submission.",
    RedotPay: settings.redotPayDetails || "Payment details will be confirmed after order submission.",
  };

  return (
    <>
      <Header />
      <main className="store-shell min-h-screen">
        <section className="mx-auto max-w-[1200px] px-3 py-10 sm:px-5 lg:px-8 lg:py-14">
          <div className="rounded-3xl border border-tiger-ember/20 bg-[linear-gradient(135deg,rgba(255,106,0,0.16),rgba(255,255,255,0.04))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.36)] sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-tiger-gold">
              <LocalizedText ar="طرق الدفع" en="Payment Methods" />
            </p>
            <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">
              <LocalizedText ar="طرق الدفع" en="Payment Methods" />
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-white/68 sm:text-base">
              <LocalizedText
                ar="اختر طريقة الدفع عند إتمام الطلب. تظهر تفاصيل الدفع حسب الطريقة المختارة مع تجربة بسيطة وآمنة."
                en="Choose a payment method at checkout. Payment details appear according to the selected method."
              />
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-3 pb-10 sm:px-5 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {methodMeta.map((method) => (
              <article
                key={method.name}
                className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.34)] transition-all duration-150 hover:-translate-y-1 hover:border-tiger-ember/45"
              >
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white p-3 shadow-[0_16px_44px_rgba(255,106,0,0.14)]">
                  <Image src={method.logo} alt={`${method.name} logo`} width={56} height={56} className="h-full w-full object-contain" />
                </span>
                <h2 className="mt-5 text-2xl font-black text-white">{method.name}</h2>
                <p className="mt-1 text-sm font-bold text-tiger-gold">{method.helper}</p>
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-sm font-bold leading-7 text-white/70">
                  {details[method.name]}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-3 pb-12 sm:px-5 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-[#202020] p-6 sm:p-7">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-tiger-gold">
                  <LocalizedText ar="دفع آمن" en="Secure checkout" />
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  <LocalizedText ar="اختر المنتج ثم أكمل الطلب بطريقة دفع جزائرية." en="Choose a product and complete your order with an Algerian payment method." />
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/62">
                  <LocalizedText ar="BaridiMob وCCP وRedotPay متاحة لطلبات الاشتراكات الرقمية." en="BaridiMob, CCP, and RedotPay are available for digital subscription orders." />
                </p>
              </div>
              <Link
                href="/shop"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-tiger-ember px-6 text-sm font-black text-black transition-colors duration-150 hover:bg-tiger-gold"
              >
                <LocalizedText ar="تصفح المتجر" en="Browse Store" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
