import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LocalizedText } from "@/components/LocalizedText";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Contact Tiger Store",
  description: "Contact Tiger Store on WhatsApp or Instagram for help with digital subscription orders in Algeria.",
  path: "/contact",
});

const contactCards = [
  {
    title: "WhatsApp",
    text: "+213 556 97 45 93",
    button: <LocalizedText ar="تواصل معنا" en="Contact Us" />,
    href: "https://wa.me/213556974593",
    logo: "/logos/contact/whatsapp.svg",
    isPhone: true,
  },
  {
    title: "Instagram",
    text: "@tigerr_store_dz",
    button: <LocalizedText ar="تابعنا" en="Follow" />,
    href: "https://www.instagram.com/tigerr_store_dz/",
    logo: "/logos/contact/instagram.svg",
  },
  {
    title: "Facebook",
    text: "Tiger Store",
    button: <LocalizedText ar="زيارة الصفحة" en="Visit Page" />,
    href: "https://www.facebook.com/people/Tiger-Store/61589903873726/",
    logo: "/logos/contact/facebook.svg",
  },
  {
    title: "Website",
    text: "digitaldz.shop",
    button: <LocalizedText ar="تصفح المتجر" en="Browse Store" />,
    href: "/shop",
    logo: "/logo/tiger-store-ui.png",
  },
];

const paymentMethods = [
  {
    name: "BaridiMob",
    text: "RIP: 00799999004414930471",
    logo: "/logos/payments/baridimob.png",
  },
  {
    name: "CCP",
    text: "Algérie Poste",
    logo: "/logos/payments/algerie-poste.svg",
  },
  {
    name: "RedotPay",
    text: "Payment details after submission",
    logo: "/logos/payments/redotpay.svg",
  },
];

const faqs = [
  ["How fast is support?", "Fast support is available for order and activation questions."],
  ["Which payments are supported?", "BaridiMob, CCP, and RedotPay are supported."],
  ["Do I need an account?", "No customer account is required to place an order."],
];

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="store-shell min-h-screen">
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-tiger-ember/18 blur-3xl" />
          <div className="mx-auto max-w-[1440px] px-3 py-10 sm:px-5 lg:px-8 lg:py-14">
            <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-tiger-gold">
                  <LocalizedText ar="تواصل" en="Contact" />
                </p>
                <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">
                  <LocalizedText ar="تواصل مع Tiger Store" en="Contact Tiger Store" />
                </h1>
                <p className="mt-4 max-w-2xl text-lg font-bold leading-8 text-white/72">
                  <LocalizedText ar="تحتاج مساعدة في اشتراكك الرقمي؟ فريقنا جاهز لمساعدتك." en="Need help with your digital subscription? Our team is ready to help." />
                </p>
                <p className="mt-2 text-base font-black text-tiger-gold">
                  <LocalizedText ar="تواصل معنا للحصول على دعم سريع وموثوق" en="Fast and trusted support for your order" />
                </p>
              </div>

              <div className="rounded-3xl border border-tiger-ember/20 bg-[linear-gradient(145deg,rgba(255,106,0,0.16),rgba(255,255,255,0.045))] p-5 shadow-[0_24px_80px_rgba(255,106,0,0.12)]">
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white p-2 shadow-orange">
                    <Image src="/logo/tiger-store-ui.png" alt="Tiger Store" width={48} height={48} className="h-full w-full object-contain" />
                  </span>
                  <div>
                    <p className="text-xl font-black text-white"><LocalizedText ar="دعم سريع" en="Fast support" /></p>
                    <p className="mt-1 text-sm leading-6 text-white/62">
                      <LocalizedText ar="إجابات واضحة، مساعدة في الطلب، ودعم التفعيل." en="Clear answers, order help, and activation support." />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-3 py-8 sm:px-5 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {contactCards.map((card) => (
              <ContactCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-[1440px] gap-4 px-3 pb-8 sm:px-5 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <article className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.36)]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-tiger-ember/30 bg-white p-2">
                  <Image src="/logo/tiger-store-ui.png" alt="Tiger Store support" width={48} height={48} className="h-full w-full object-contain" />
                </span>
                <div>
                  <h2 className="text-2xl font-black text-white"><LocalizedText ar="مكتب دعم احترافي" en="Premium support desk" /></h2>
                  <p className="mt-1 text-sm leading-7 text-white/62">
                    <LocalizedText ar="دعم سريع للاشتراكات، حالة الطلب، وأسئلة التفعيل." en="Fast support for subscriptions, order status, and activation questions." />
                  </p>
                </div>
              </div>
              <Link
                href="https://wa.me/213556974593"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-tiger-ember px-6 text-sm font-black text-black transition-colors duration-150 hover:bg-tiger-gold"
              >
                <LocalizedText ar="تواصل معنا" en="Contact Us" />
              </Link>
            </div>
          </article>

          <article className="rounded-3xl border border-tiger-ember/20 bg-[#1c1713] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.36)]">
            <div className="mb-5 flex items-center gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-tiger-ember/30 bg-white p-2">
                <Image src="/logos/payments/baridimob.png" alt="BaridiMob" width={48} height={48} className="h-full w-full object-contain" />
              </span>
              <div>
                <h2 className="text-2xl font-black text-white"><LocalizedText ar="طرق الدفع" en="Payment methods" /></h2>
                <p className="mt-1 text-sm font-bold text-tiger-gold">
                  <LocalizedText ar="طرق دفع موثوقة في الجزائر" en="Secure Algerian payment methods" />
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <PaymentBadge key={method.name} {...method} />
              ))}
            </div>
            <p className="mt-4 text-sm leading-7 text-white/62">
              <LocalizedText ar="طرق دفع جزائرية موثوقة للاشتراكات الرقمية." en="Secure Algerian payment methods for digital subscriptions." />
            </p>
          </article>
        </section>

        <section className="mx-auto max-w-[1440px] px-3 pb-10 sm:px-5 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-3xl border border-white/10 bg-[#202020] p-5">
              <div className="mb-4 flex items-center gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-tiger-ember/30 bg-white p-2">
                  <Image src="/logo/tiger-store-ui.png" alt="Tiger Store" width={42} height={42} className="h-full w-full object-contain" />
                </span>
                <div>
                  <h2 className="text-2xl font-black text-white"><LocalizedText ar="القنوات الرسمية" en="Official channels" /></h2>
                  <p className="mt-1 text-sm text-white/58">
                    <LocalizedText ar="استعمل صفحات Tiger Store الرسمية فقط." en="Use Tiger Store verified social pages only." />
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                <SocialLink href="https://www.instagram.com/tigerr_store_dz/" logo="/logos/contact/instagram.svg" label="Instagram: @tigerr_store_dz" />
                <SocialLink href="https://www.facebook.com/people/Tiger-Store/61589903873726/" logo="/logos/contact/facebook.svg" label="Facebook: Tiger Store" />
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-[#202020] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-tiger-gold"><LocalizedText ar="أسئلة مختصرة" en="Mini FAQ" /></p>
              <h2 className="mt-2 text-2xl font-black text-white"><LocalizedText ar="إجابات سريعة" en="Quick answers" /></h2>
              <div className="mt-4 grid gap-3">
                {faqs.map(([question, answer]) => (
                  <div key={question} className="rounded-2xl border border-white/10 bg-black/24 p-4">
                    <h3 className="font-black text-white">{question}</h3>
                    <p className="mt-1 text-sm leading-7 text-white/62">{answer}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-3 pb-12 sm:px-5 lg:px-8">
          <div className="rounded-3xl border border-tiger-ember/25 bg-[linear-gradient(135deg,rgba(255,106,0,0.18),rgba(255,255,255,0.04))] p-6 text-center shadow-[0_26px_90px_rgba(255,106,0,0.12)]">
            <h2 className="text-2xl font-black text-white"><LocalizedText ar="جاهز لتصفح Tiger Store؟" en="Ready to browse Tiger Store?" /></h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-white/64">
              <LocalizedText ar="اختر اشتراكك الرقمي وأكمل الطلب بتجربة بسيطة وواضحة." en="Find your digital subscription and complete your order in a clean, simple flow." />
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-tiger-ember px-6 text-sm font-black text-black transition-colors duration-150 hover:bg-tiger-gold"
            >
              <LocalizedText ar="تصفح المتجر" en="Browse Store" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ContactCard({
  title,
  text,
  button,
  href,
  logo,
  isPhone,
}: {
  title: string;
  text: string;
  button: ReactNode;
  href: string;
  logo: string;
  isPhone?: boolean;
}) {
  const external = href.startsWith("http");

  return (
    <article className="group rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.34)] transition-all duration-150 hover:-translate-y-1 hover:border-tiger-ember/45">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-tiger-ember/30 bg-white p-2 shadow-[0_14px_42px_rgba(255,106,0,0.16)]">
        <Image src={logo} alt={`${title} logo`} width={48} height={48} className="h-full w-full object-contain" />
      </span>
      <h2 className="mt-5 text-xl font-black text-white">{title}</h2>
      <p className={`mt-2 min-h-6 text-sm font-bold text-white/62 ${isPhone ? "phone-ltr" : ""}`}>{text}</p>
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-tiger-ember/35 bg-tiger-ember/12 px-4 text-sm font-black text-tiger-gold transition-colors duration-150 hover:bg-tiger-ember hover:text-black"
      >
        {button}
      </Link>
    </article>
  );
}

function PaymentBadge({ name, text, logo }: { name: string; text: string; logo: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/28 p-3 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white p-2">
        <Image src={logo} alt={`${name} logo`} width={44} height={44} className="h-full w-full object-contain" />
      </span>
      <p className="mt-2 text-xs font-black text-white">{name}</p>
      <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-white/50">{text}</p>
    </div>
  );
}

function SocialLink({ href, logo, label }: { href: string; logo: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-black/24 px-4 py-3 font-bold text-white/78 transition-colors duration-150 hover:border-tiger-ember/45 hover:text-tiger-gold"
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white p-1.5">
        <Image src={logo} alt="" width={26} height={26} className="h-full w-full object-contain" />
      </span>
      {label}
    </Link>
  );
}
