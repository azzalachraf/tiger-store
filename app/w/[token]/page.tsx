import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { acknowledgeBalanceAction, submitTelegramWarrantyAction } from "@/app/w/[token]/actions";
import { WarrantyForm } from "@/app/w/[token]/WarrantyForm";
import { getOrderById } from "@/lib/admin-store";
import { getTelegramWarranty } from "@/lib/telegram-warranty";

export const dynamic = "force-dynamic";
export const metadata = { title: "Warranty certificate", robots: { index: false, follow: false } };

const copy = {
  ar: {
    title: "ضمان Snapchat", form: "أكمل بيانات الضمان", review: "راجع المعلومات جيداً: بعد التأكيد لا يمكن تعديلها.", name: "الاسم الكامل", user: "اسم المستخدم", platform: "منصة التفعيل", phone: "رقم الهاتف", email: "البريد الإلكتروني", paymentMethod: "طريقة الدفع", confirm: "تأكيد وإصدار الشهادة", ready: "شهادتك جاهزة", download: "تحميل شهادة PDF", accept: "فهمت التنبيه وأتابع", order: "الطلب", product: "المنتج", plan: "الخطة", expiry: "تاريخ الانتهاء",
    warningTitle: "تنبيه بخصوص رصيد INR",
    warning: "قد يطلب Snapchat رصيداً متاحاً في حساب Apple أو Google بحسب البلد ونشاط الحساب. قد يُستخدم الرصيد في Bitmoji أو استرجاع Streaks أو مشتريات داخل بعض الألعاب أو خدمات Snapchat. توفر هذه الخيارات ورسومها وأهليتها يحدده Snapchat ومتجر الحساب، وTiger Store لا يضمن أي ميزة أو شراء أو قيمة إضافية للرصيد. تأكد من الرصيد والبلد قبل المتابعة.",
    platformOptions: { placeholder: "اختر المنصة", instagram: "Instagram", snapchat: "Snapchat", facebook: "Facebook" }, paymentOptions: { placeholder: "اختر طريقة الدفع", baridiMob: "BaridiMob", binance: "Binance", redotPay: "RedotPay", flexy: "Flexy" },
  },
  en: {
    title: "Snapchat warranty", form: "Complete warranty details", review: "Review carefully: details cannot be changed after confirmation.", name: "Full name", user: "Username", platform: "Activation platform", phone: "Phone", email: "Email", paymentMethod: "Payment method", confirm: "Confirm and issue certificate", ready: "Your certificate is ready", download: "Download PDF certificate", accept: "I understand and continue", order: "Order", product: "Product", plan: "Plan", expiry: "Expiry",
    warningTitle: "INR balance notice",
    warning: "Snapchat may require available Apple or Google account balance depending on the account country and activity. The balance may be used for Bitmoji, restoring Streaks, or purchases in some games or Snapchat services. Snapchat and the account store decide availability, fees, and eligibility; Tiger Store does not guarantee any feature, purchase, or extra value from that balance. Check your balance and country before continuing.",
    platformOptions: { placeholder: "Choose a platform", instagram: "Instagram", snapchat: "Snapchat", facebook: "Facebook" }, paymentOptions: { placeholder: "Choose a payment method", baridiMob: "BaridiMob", binance: "Binance", redotPay: "RedotPay", flexy: "Flexy" },
  },
} as const;

export default async function TelegramWarrantyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const warranty = await getTelegramWarranty(token);
  if (!warranty) notFound();
  const order = await getOrderById(warranty.order_id);
  const ar = (await cookies()).get("tiger-store-locale")?.value !== "en";
  const locale = ar ? "ar" : "en";
  const c = copy[locale];
  const item = order?.products[0];
  if (!order || !item) notFound();

  return <main className="store-shell min-h-screen px-4 py-8" dir={ar ? "rtl" : "ltr"} lang={locale}>
    <section className="mx-auto max-w-xl rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] p-6 shadow-xl">
      <p className="text-sm font-black text-tiger-ember">TIGER STORE</p>
      <h1 className="mt-2 text-3xl font-black text-[var(--text)]">{warranty.customer_details_complete ? c.ready : c.form}</h1>
      {warranty.customer_details_complete ? <div className="mt-6 space-y-3 text-[var(--text)]">
        <p><b>{c.order}:</b> <span dir="ltr">{order.id}</span></p>
        <p><b>{c.product}:</b> {ar ? item.nameAr : item.name}</p>
        <p><b>{c.plan}:</b> {ar ? item.optionAr : item.option}</p>
        <p><b>{c.expiry}:</b> {new Intl.DateTimeFormat(ar ? "ar-DZ" : "en-GB", { dateStyle: "long" }).format(new Date(warranty.ends_at))}</p>
        {warranty.balance_warning_required && !warranty.balance_warning_acknowledged_at ? <form action={acknowledgeBalanceAction} className="rounded-2xl border border-orange-300 bg-orange-50 p-4 text-[#532600]">
          <p className="font-black">{c.warningTitle}</p><p className="mt-2 text-sm font-semibold leading-7">{c.warning}</p>
          <input type="hidden" name="token" value={token} />
          <button className="mt-3 min-h-11 rounded-xl bg-[#FF7300] px-4 font-black text-black">{c.accept}</button>
        </form> : <a className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[#FF7300] font-black text-black" href={"/w/" + token + "/certificate.pdf"}>{c.download}</a>}
      </div> : <div className="mt-6"><WarrantyForm token={token} action={submitTelegramWarrantyAction} copy={{ ...c, back: ar ? "رجوع" : "Back", next: ar ? "مراجعة المعلومات" : "Review details" }} /></div>}
    </section>
  </main>;
}
