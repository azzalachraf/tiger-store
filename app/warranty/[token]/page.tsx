import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { CheckCircle2, Download, ShieldCheck } from "lucide-react";
import { getOrderById } from "@/lib/admin-store";
import { claimWarrantyCertificateAction } from "@/app/warranty/actions";
import { warrantyCertificateCode, warrantyClaimCookieName, warrantyEndDate, verifyWarrantyClaimCookie, verifyWarrantyLink } from "@/lib/warranty";

export const dynamic = "force-dynamic";
export const metadata = { title: "Warranty certificate", robots: { index: false, follow: false } };

type WarrantyPageProps = {
  params: Promise<{ token: string }>;
};

export default async function WarrantyPage({ params }: WarrantyPageProps) {
  const { token } = await params;
  const payload = verifyWarrantyLink(token);
  if (!payload) notFound();
  const order = await getOrderById(payload.orderId);
  const item = order?.products[payload.itemIndex];
  if (!order || order.status !== "delivered" || !item) notFound();

  const cookieStore = await cookies();
  const recipientName = verifyWarrantyClaimCookie(payload, cookieStore.get(warrantyClaimCookieName(token))?.value);
  const isArabic = cookieStore.get("tiger-store-locale")?.value !== "en";
  const copy = isArabic ? {
    eyebrow: "شهادة الضمان", title: "شهادة الضمان", intro: "رابط خاص لإصدار شهادة ضمان اشتراكك الرقمي.",
    ready: "تم إنشاء شهادة الضمان", readyText: "احتفظ بها للرجوع إليها عند الحاجة إلى الدعم.", recipient: "صاحب الشهادة", product: "المنتج", plan: "الخطة", order: "رمز الطلب", certificate: "رمز الشهادة", coverage: "مدة التغطية", ends: "تنتهي التغطية", days: "يوم",
    terms: "شروط الضمان", replacement: "عند وجود مشكلة مشمولة سببها Tiger Store، نحاول الاستبدال أولاً.", refund: "إذا تعذر الاستبدال، يُحتسب استرجاع الجزء غير المستخدم من مدة الضمان بشكل نسبي.", excluded: "المشاكل الناتجة عن العميل غير مشمولة.", download: "تحميل الشهادة PDF", support: "تحتاج مساعدة؟ تواصل معنا",
    complete: "أكمل بيانات الشهادة", instruction: "اكتب الاسم الذي تريد أن يظهر في شهادة الضمان، ثم أكّد استلام المنتج.", name: "الاسم في الشهادة", accept: "أؤكد أن المنتج تم تسليمه وأفهم شروط الضمان أعلاه.", issue: "إصدار شهادتي",
  } : {
    eyebrow: "WARRANTY CERTIFICATE", title: "Warranty certificate", intro: "A private link to issue your digital subscription warranty certificate.",
    ready: "Your warranty certificate is ready", readyText: "Keep it for reference if you ever need support.", recipient: "Certificate holder", product: "Product", plan: "Plan", order: "Order code", certificate: "Certificate code", coverage: "Coverage", ends: "Coverage ends", days: "days",
    terms: "Warranty terms", replacement: "For a covered failure caused by Tiger Store, we attempt replacement first.", refund: "If replacement is impossible, the unused covered period is refunded proportionally.", excluded: "Customer-caused problems are not covered.", download: "Download PDF certificate", support: "Need help? Contact us",
    complete: "Complete your certificate", instruction: "Enter the name that should appear on your certificate, then confirm that you received the product.", name: "Name on the certificate", accept: "I confirm that the product was delivered and I understand the warranty terms above.", issue: "Issue my certificate",
  };
  const coverageEnd = new Intl.DateTimeFormat(isArabic ? "ar-DZ" : "en-GB", { dateStyle: "long" }).format(warrantyEndDate(payload));
  const certificateCode = warrantyCertificateCode(payload);
  const productName = isArabic ? item.nameAr || item.name : item.name;
  const planName = isArabic ? item.optionAr || item.option : item.option;

  return (
    <main className="store-shell min-h-screen px-4 py-8 sm:px-6 sm:py-12" dir={isArabic ? "rtl" : "ltr"}>
      <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] shadow-[0_22px_65px_rgba(23,18,15,0.1)]">
        <div className="bg-[#17120F] px-6 py-8 text-[#FFF8F1] sm:px-9">
          <div className="flex items-center gap-3 text-[#FF8A3D]"><ShieldCheck className="h-7 w-7" /><span className="text-sm font-black tracking-wide">TIGER STORE</span></div>
          <h1 className="mt-5 text-3xl font-black leading-tight text-white sm:text-4xl">{copy.title}</h1>
          <p className="mt-2 leading-7 text-white/75">{copy.intro}</p>
        </div>

        {recipientName ? (
          <div className="p-6 sm:p-9">
            <div className="flex items-start gap-3 rounded-2xl border border-[#B8E8C5] bg-[#EEF9F0] p-4 text-[#176B35]"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">{copy.ready}</p><p className="mt-1 text-sm leading-6">{copy.readyText}</p></div></div>
            <div className="mt-6 grid gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--page)] p-5">
              <Info label={copy.recipient} value={recipientName} />
              <Info label={copy.product} value={productName} />
              <Info label={copy.plan} value={planName} />
              <Info label={copy.order} value={order.id} ltr />
              <Info label={copy.certificate} value={certificateCode} ltr />
              <Info label={copy.coverage} value={`${payload.coveredDays} ${copy.days}`} />
              <Info label={copy.ends} value={coverageEnd} />
            </div>
            <div className="mt-6 rounded-2xl border border-[#EAC8A7] bg-[#FFF1E6] p-5 text-sm leading-7 text-[#594438]">
              <p className="font-black text-[#8E3C00]">{copy.terms}</p>
              <ul className="mt-2 list-inside list-disc space-y-1"><li>{copy.replacement}</li><li>{copy.refund}</li><li>{copy.excluded}</li></ul>
            </div>
            <a href={`/warranty/${token}/certificate.pdf`} className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF7300] px-5 font-black text-[#17120F] transition-colors hover:bg-[#E76800]"><Download className="h-5 w-5" />{copy.download}</a>
            <Link href="/contact" className="mt-3 flex min-h-11 items-center justify-center text-sm font-bold text-[var(--muted-text)] underline underline-offset-4">{copy.support}</Link>
          </div>
        ) : (
          <form action={claimWarrantyCertificateAction} className="p-6 sm:p-9">
            <input type="hidden" name="token" value={token} />
            <p className="text-lg font-black text-[var(--text)]">{copy.complete}</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-text)]">{copy.instruction}</p>
            <label className="mt-6 grid gap-2 text-sm font-bold text-[var(--text)]">{copy.name}
              <input name="recipientName" defaultValue={order.customerName} required minLength={2} maxLength={160} className="min-h-12 rounded-xl border border-[var(--border-color)] bg-[var(--page)] px-4 text-base text-[var(--text)]" />
            </label>
            <label className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--page)] p-4 text-sm font-bold leading-6 text-[var(--text)]"><input name="accepted" value="yes" type="checkbox" required className="mt-1 h-4 w-4 accent-[#FF7300]" />{copy.accept}</label>
            <button type="submit" className="mt-6 min-h-12 w-full rounded-xl bg-[#FF7300] px-5 font-black text-[#17120F] transition-colors hover:bg-[#E76800]">{copy.issue}</button>
          </form>
        )}
      </section>
    </main>
  );
}

function Info({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-color)] pb-3 last:border-0 last:pb-0"><span className="text-sm font-bold text-[var(--muted-text)]">{label}</span><span className="font-black text-[var(--text)]" dir={ltr ? "ltr" : undefined}>{value}</span></div>;
}
