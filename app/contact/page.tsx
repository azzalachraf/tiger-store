import Link from "next/link";
import { Facebook, Instagram, MessageCircle, Send } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LocalizedText } from "@/components/LocalizedText";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Contact Tiger Store",
  description: "Contact Tiger Store for help with digital subscription orders in Algeria.",
  path: "/contact",
});

const channels = [
  { title: "WhatsApp", detail: "+213 556 97 45 93", href: "https://wa.me/213556974593", Icon: MessageCircle },
  { title: "Instagram", detail: "@tigerr_store_dz", href: "https://www.instagram.com/tigerr_store_dz/", Icon: Instagram },
  { title: "Facebook", detail: "Tiger Store", href: "https://www.facebook.com/tigerr.store.dz", Icon: Facebook },
  { title: "Telegram", detail: "@Tigerstoredz", href: "https://t.me/Tigerstoredz", Icon: Send },
] as const;

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="store-shell min-h-screen px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] p-6 sm:p-9">
            <p className="text-sm font-black text-[#C54E00]"><LocalizedText ar="الدعم" en="Support" /></p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text)] sm:text-4xl"><LocalizedText ar="تواصل مع Tiger Store" en="Contact Tiger Store" /></h1>
            <p className="mt-3 max-w-2xl leading-7 text-[var(--muted-text)]"><LocalizedText ar="للمساعدة في طلبك أو التفعيل، تواصل معنا عبر القناة المناسبة." en="For help with an order or activation, contact us through the channel that suits you." /></p>
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Tiger Store contact channels">
            {channels.map(({ title, detail, href, Icon }) => (
              <a key={title} href={href} target="_blank" rel="noreferrer" className="group flex min-h-24 items-center gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4 transition-colors hover:border-[#FF7300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7300] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page)]">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF1E6] text-[#C54E00] group-hover:bg-[#FF7300] group-hover:text-[#17120F]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className="min-w-0"><span className="block font-black text-[var(--text)]">{title}</span><span className="mt-1 block truncate text-sm font-semibold text-[var(--muted-text)]" dir={title === "WhatsApp" ? "ltr" : undefined}>{detail}</span></span>
              </a>
            ))}
          </section>

          <section className="mt-4 rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] p-6 sm:p-8">
            <h2 className="text-xl font-black text-[var(--text)]"><LocalizedText ar="عند المتابعة بخصوص طلب" en="For order follow-up" /></h2>
            <p className="mt-2 max-w-2xl leading-7 text-[var(--muted-text)]"><LocalizedText ar="أرسل رمز الطلب فقط حتى نقدر نلقاو طلبك بسرعة. التفعيل يبدأ عادةً خلال 15 دقيقة إلى 12 ساعة بعد تأكيد الدفع." en="Send only your order code so we can find the order quickly. Activation usually begins within 15 minutes–12 hours after payment verification." /></p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/shop" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#FF7300] px-5 text-sm font-black text-[#17120F] hover:bg-[#E76800] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7300] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"><LocalizedText ar="تصفح المتجر" en="Browse store" /></Link>
              <Link href="/faq" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-color)] px-5 text-sm font-black text-[var(--text)] hover:bg-[var(--page)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7300] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"><LocalizedText ar="الأسئلة الشائعة" en="FAQ" /></Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
