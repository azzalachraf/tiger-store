import Image from "next/image";
import Link from "next/link";
import { LocalizedText } from "@/components/LocalizedText";

const BRAND_LOGO = "/logo/tiger-store-ui.png";

type FooterProps = {
  disclaimer?: string;
};

export function Footer({ disclaimer }: FooterProps) {
  return (
    <footer className="border-t border-white/10 bg-[#111]">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-3 py-10 sm:px-5 md:grid-cols-[1.35fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_14px_32px_rgba(0,0,0,0.34)]">
              <Image src={BRAND_LOGO} alt="Tiger Store" fill sizes="56px" className="object-cover object-left" />
            </span>
            <div>
              <p className="text-lg font-black text-white">Tiger Store</p>
              <p className="text-sm font-bold text-tiger-gold">digitaldz.shop</p>
            </div>
          </div>
          <p className="max-w-md text-sm font-semibold leading-7 text-white/62">
            <LocalizedText
              ar="متجر اشتراكات رقمية في الجزائر لخدمات الذكاء الاصطناعي، التصميم، التعليم، والبرامج. تفعيل واضح ودعم عبر واتساب."
              en="Digital subscription store in Algeria for AI, design, education, and software. Clear activation and WhatsApp support."
            />
          </p>
          <p className="mt-4 max-w-xl text-xs leading-6 text-white/42">
            {disclaimer ??
              "Tiger Store is an independent digital subscription provider and is not officially affiliated with the brands listed."}
          </p>
        </div>

        <div>
          <p className="mb-3 font-black text-white">
            <LocalizedText ar="روابط مفيدة" en="Useful links" />
          </p>
          <div className="flex flex-col gap-2 text-sm font-semibold text-white/62">
            <Link href="/about" className="hover:text-tiger-gold"><LocalizedText ar="من نحن" en="About" /></Link>
            <Link href="/shop" className="hover:text-tiger-gold"><LocalizedText ar="المتجر" en="Shop" /></Link>
            <Link href="/faq" className="hover:text-tiger-gold"><LocalizedText ar="الأسئلة" en="FAQ" /></Link>
            <Link href="/payment-methods" className="hover:text-tiger-gold"><LocalizedText ar="طرق الدفع" en="Payment methods" /></Link>
            <Link href="/refund-policy" className="hover:text-tiger-gold"><LocalizedText ar="سياسة الاسترجاع" en="Refund policy" /></Link>
          </div>
        </div>

        <div>
          <p className="mb-3 font-black text-white"><LocalizedText ar="طرق الدفع" en="Payment methods" /></p>
          <div className="grid gap-2 text-sm font-semibold text-white/72">
            <PaymentFooterItem logo="/logos/payments/baridimob.png" label="BaridiMob" />
            <PaymentFooterItem logo="/logos/payments/algerie-poste.svg" label="CCP" />
            <PaymentFooterItem logo="/logos/payments/redotpay.svg" label="RedotPay" />
          </div>
        </div>

        <div>
          <p className="mb-3 font-black text-white"><LocalizedText ar="الدعم" en="Support" /></p>
          <div className="flex flex-col gap-2 text-sm font-semibold text-white/62">
            <a href="https://www.instagram.com/tigerr_store_dz/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-tiger-gold">
              <Image src="/logos/contact/instagram.svg" alt="" width={18} height={18} className="h-4 w-4 object-contain" />
              Instagram
            </a>
            <a href="https://www.facebook.com/people/Tiger-Store/61589903873726/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-tiger-gold">
              <Image src="/logos/contact/facebook.svg" alt="" width={18} height={18} className="h-4 w-4 object-contain" />
              Facebook
            </a>
            <Link href="/contact" className="inline-flex items-center gap-2 hover:text-tiger-gold">
              <span className="relative h-5 w-5 overflow-hidden rounded-full bg-white">
                <Image src={BRAND_LOGO} alt="" fill sizes="20px" className="object-cover object-left" />
              </span>
              <LocalizedText ar="صفحة التواصل" en="Contact page" />
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-3 py-4 text-center text-xs text-white/45">
        © 2026 Tiger Store. digitaldz.shop
      </div>
    </footer>
  );
}

function PaymentFooterItem({ logo, label }: { logo: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/24 px-3 py-2">
      <Image src={logo} alt="" width={24} height={24} className="h-5 w-5 rounded-sm bg-white object-contain p-0.5" />
      {label}
    </span>
  );
}
