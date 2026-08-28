"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Home, MessageCircle, ReceiptText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addCartItem, createCartItem, getCartSubtotal, getProductOffers, readCart, writeCart } from "@/lib/cart";
import { submitReceiptOrderAction } from "@/app/checkout/actions";
import type { CartItem, PaymentMethodId, Product, SiteSettings } from "@/lib/types";
import { formatPriceDZD } from "@/lib/utils";
import { useLocale } from "@/lib/useLocale";

const standardPaymentMethods: PaymentMethodId[] = ["BaridiMob", "Binance", "RedotPay"];
type Step = "details" | "payment" | "receipt" | "complete";

type CheckoutViewProps = {
  products: Product[];
  directProductSlug?: string;
  directOption?: string;
  settings: SiteSettings;
  initialItems?: CartItem[];
  lockedProductLink?: boolean;
  allowedPaymentMethods?: PaymentMethodId[];
};

export function CheckoutView({ products, directProductSlug, directOption, settings, initialItems, lockedProductLink = false, allowedPaymentMethods = standardPaymentMethods }: CheckoutViewProps) {
  const [items, setItems] = useState<CartItem[]>(initialItems ?? []);
  const [step, setStep] = useState<Step>("details");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>(allowedPaymentMethods[0] ?? "BaridiMob");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [orderCode, setOrderCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { locale } = useLocale();
  const ar = locale === "ar";
  const copy = ar ? {
    title: "أكمل طلبك بخطوات واضحة", description: "أدخل بياناتك، اختر طريقة التحويل، ثم ارفع وصل الدفع. لا يتم الدفع داخل الموقع.", details: "بياناتك", payment: "طريقة الدفع", receipt: "وصل الدفع", complete: "تم استلام طلبك", name: "الاسم الكامل", phone: "رقم الهاتف", notes: "ملاحظات التفعيل", next: "متابعة", confirm: "تأكيد الطلب", upload: "رفع الوصل وإرسال الطلب", chooseReceipt: "اختر صورة وصل الدفع", required: "وصل الدفع إلزامي لإرسال الطلب.", summary: "ملخص الطلب", total: "المجموع", empty: "السلة فارغة.", browse: "تصفح المنتجات", instructions: "تعليمات الدفع", after: "بعد التحويل، ارفع صورة الوصل هنا. يبدأ التفعيل عادة خلال 15 دقيقة إلى 12 ساعة بعد تأكيد الدفع.", success: "احتفظ برمز الطلب للمتابعة. سنراجع الوصل ثم نحدّث حالة الطلب.", back: "العودة إلى السلة", clear: "تفريغ السلة", paymentDetails: "بيانات التحويل", status: "حالة الطلب: قيد مراجعة الوصل" } : {
    title: "Complete your order in clear steps", description: "Enter your details, choose a transfer method, then upload the receipt. Payment is never collected on this site.", details: "Your details", payment: "Payment method", receipt: "Receipt", complete: "Order received", name: "Full name", phone: "Phone number", notes: "Activation notes", next: "Continue", confirm: "Confirm order", upload: "Upload receipt and send order", chooseReceipt: "Choose receipt image", required: "A receipt is required to send the order.", summary: "Order summary", total: "Total", empty: "Your cart is empty.", browse: "Browse products", instructions: "Payment instructions", after: "After transferring, upload the receipt image here. Activation usually begins within 15 minutes–12 hours after payment verification.", success: "Keep your order code for follow-up. We will review the receipt and update the order status.", back: "Back to cart", clear: "Clear cart", paymentDetails: "Transfer details", status: "Order status: receipt under review" };

  useEffect(() => {
    if (lockedProductLink) return;
    const timer = window.setTimeout(() => {
      let current = readCart();
      if (!current.length && directProductSlug) {
        const product = products.find((entry) => entry.slug === directProductSlug);
        const offer = product ? getProductOffers(product).find((entry) => entry.id === directOption) ?? getProductOffers(product)[0] : undefined;
        if (product && offer) current = addCartItem(createCartItem(product, offer));
      }
      const repaired = current.map((item) => {
        const product = products.find((entry) => entry.slug === item.slug);
        const offers = product ? getProductOffers(product) : [];
        const offer = offers.find((entry) => entry.id === item.optionId) ?? offers.find((entry) => entry.label === item.option || entry.labelAr === item.optionAr);
        return product && offer ? createCartItem(product, offer, item.quantity) : item;
      });
      if (repaired.some((item, index) => item !== current[index])) writeCart(repaired);
      setItems(repaired);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [directOption, directProductSlug, lockedProductLink, products]);
  const total = useMemo(() => getCartSubtotal(items), [items]);
  // `ccpDetails` is retained as the existing Supabase settings column until a future
  // database migration renames it. Its customer-facing payment method is Binance.
  const instructions = paymentMethod === "BaridiMob" ? `RIP: ${settings.baridiMobRip}` : paymentMethod === "Binance" ? settings.ccpDetails : paymentMethod === "RedotPay" ? settings.redotPayDetails : (ar ? "اخترت Flexy. أرفق وصل الدفع بعد إتمامه." : "Flexy selected. Attach your receipt after payment.");
  const lines = items.map(({ slug, optionId, quantity }) => ({ slug, optionId, quantity }));

  function progress(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); if (step === "details") setStep("payment"); else if (step === "payment") setStep("receipt"); }
  async function sendReceipt() { if (!receipt) { setError(copy.required); return; } if (name.trim().length < 2 || phone.trim().length < 6) { setStep("details"); setError(ar ? "أدخل الاسم ورقم الهاتف الصحيح أولاً." : "Enter your name and a valid phone number first."); return; } setSaving(true); setError(""); try { const form = new FormData(); form.set("customerName", name); form.set("phone", phone); form.set("notes", notes); form.set("paymentMethod", paymentMethod); form.set("lines", JSON.stringify(lines)); form.set("receipt", receipt); const result = await submitReceiptOrderAction(form); if (!result.ok) { setStep("details"); setError(result.code === "invalid_phone" ? (ar ? "أدخل رقم هاتف جزائري صحيح، مثلاً 0550 123 456 أو +213 550 123 456." : "Enter a valid Algerian mobile number, for example 0550 123 456 or +213 550 123 456.") : (ar ? "تعذّر حفظ طلبك. راجع معلوماتك ووصل الدفع ثم أعد المحاولة." : "We could not save your order. Check your information and receipt, then try again.")); return; } setOrderCode(result.order.id); if (!lockedProductLink) { writeCart([]); setItems([]); } setStep("complete"); } catch { setError(ar ? "تعذّر إرسال الطلب. أعد المحاولة." : "Unable to save your order."); } finally { setSaving(false); } }

  if (!items.length && step !== "complete") return <main className="store-shell min-h-screen px-4 py-10"><div className="mx-auto max-w-xl rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-7 text-center"><p className="font-bold text-[var(--text)]">{copy.empty}</p><Button asChild className="mt-4"><Link href="/shop">{copy.browse}</Link></Button></div></main>;
  if (step === "complete") {
    const completeCopy = ar
      ? { badge: "تم استلام الوصل", title: "شكراً، طلبك قيد المراجعة", body: "وصل الدفع تاعك وصلنا. نراجعوه ثم نحدّث حالة الطلب.", code: "رمز الطلب", next: "وش يصرا بعد؟", steps: ["نراجع وصل الدفع.", "نؤكد الطلب ونجهّز التفعيل.", "نحدّث حالة الطلب."], home: "العودة للرئيسية", support: "تواصل للدعم" }
      : { badge: "Receipt received", title: "Thank you, your order is under review", body: "We received your receipt. We will review it, then update the order status.", code: "Order code", next: "What happens next?", steps: ["We review the payment receipt.", "We confirm the order and prepare activation.", "We update the order status."], home: "Return home", support: "Contact support" };
    return <main className="store-shell min-h-screen px-4 py-10 sm:px-6"><div className="mx-auto max-w-3xl" dir={ar ? "rtl" : "ltr"}><section className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface)]"><div className="border-b border-[var(--border-color)] bg-[var(--page)] p-6 text-center sm:p-9"><span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F7ED] text-[#16803C]"><CheckCircle2 className="h-7 w-7" /></span><p className="mt-4 text-sm font-black text-[#16803C]">{completeCopy.badge}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--text)] sm:text-4xl">{completeCopy.title}</h1><p className="mx-auto mt-3 max-w-xl leading-7 text-[var(--muted-text)]">{completeCopy.body}</p></div><div className="grid gap-4 p-5 sm:grid-cols-[0.9fr_1.1fr] sm:p-7"><div className="rounded-2xl border border-[var(--border-color)] bg-[var(--page)] p-5"><ReceiptText className="h-5 w-5 text-[#C54E00]" /><p className="mt-4 text-sm font-bold text-[var(--muted-text)]">{completeCopy.code}</p><p className="mt-1 break-all text-xl font-black text-[var(--text)]" dir="ltr">{orderCode}</p><p className="mt-4 rounded-xl bg-[var(--surface)] p-3 text-sm font-bold text-[var(--text)]">{copy.status}</p></div><div><h2 className="text-lg font-black text-[var(--text)]">{completeCopy.next}</h2><ol className="mt-4 grid gap-3">{completeCopy.steps.map((item, index) => <li key={item} className="flex items-center gap-3 text-sm font-semibold text-[var(--muted-text)]"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF1E6] text-xs font-black text-[#C54E00]">{index + 1}</span>{item}</li>)}</ol></div></div><div className="flex flex-col gap-3 border-t border-[var(--border-color)] p-5 sm:flex-row sm:justify-end sm:p-7"><Button asChild variant="secondary" className="min-h-11"><Link href="/contact"><MessageCircle className="h-4 w-4" />{completeCopy.support}</Link></Button><Button asChild className="min-h-11"><Link href="/"><Home className="h-4 w-4" />{completeCopy.home}</Link></Button></div></section></div></main>;
  }

  return <main className="store-shell min-h-screen px-3 py-6 sm:px-5 lg:px-8" dir={ar ? "rtl" : "ltr"}><div className="mx-auto max-w-6xl"><section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5 sm:p-7"><p className="text-sm font-black text-[#C54E00]">{copy.title}</p><p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted-text)]">{copy.description}</p><ol className="mt-5 grid gap-2 sm:grid-cols-3">{([copy.details, copy.payment, copy.receipt] as const).map((label, index) => <li key={label} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${index <= ["details", "payment", "receipt"].indexOf(step) ? "border-[#FF7300] bg-[#FFF1E6] text-[#17120F]" : "border-[var(--border-color)] text-[var(--muted-text)]"}`}><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FF7300] text-xs text-[#17120F]">{index + 1}</span>{label}</li>)}</ol></section>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]"><form onSubmit={progress} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5"><h1 className="text-2xl font-black text-[var(--text)]">{step === "details" ? copy.details : step === "payment" ? copy.payment : copy.instructions}</h1>{step === "details" && <div className="mt-5 grid gap-4"><Field label={copy.name} value={name} onChange={setName} required /><Field label={copy.phone} value={phone} onChange={setPhone} required type="tel" placeholder="0550 123 456" /><Field label={copy.notes} value={notes} onChange={setNotes} textarea /></div>}{error && step !== "receipt" && <p role="alert" className="mt-4 text-sm font-bold text-[#C62828]">{error}</p>}{step === "payment" && <div className="mt-5 grid gap-3"><div className={`grid gap-2 ${allowedPaymentMethods.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>{allowedPaymentMethods.map((method) => <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`min-h-12 rounded-xl border px-2 text-sm font-black ${paymentMethod === method ? "border-[#FF7300] bg-[#FF7300] text-[#17120F]" : "border-[var(--border-color)] bg-[var(--page)] text-[var(--text)]"}`}>{method}</button>)}</div><p className="rounded-xl border border-[var(--border-color)] bg-[var(--page)] p-4 text-sm font-bold text-[var(--text)]">{copy.paymentDetails}: <span dir="ltr">{instructions}</span></p></div>}{step === "receipt" && <div className="mt-5 grid gap-4"><p className="rounded-xl border border-[var(--border-color)] bg-[var(--page)] p-4 text-sm font-bold leading-7 text-[var(--text)]"><span className="block" dir="ltr">{instructions}</span><span className="mt-2 block text-[var(--muted-text)]">{copy.after}</span></p><label className="grid gap-2 text-sm font-bold text-[var(--text)]">{copy.chooseReceipt}<input type="file" accept="image/png,image/jpeg,image/webp" required onChange={(event) => setReceipt(event.target.files?.[0] ?? null)} className="min-h-12 rounded-xl border border-[var(--border-color)] bg-[var(--page)] p-2" /></label>{error && <p role="alert" className="text-sm font-bold text-[#C62828]">{error}</p>}<Button type="button" onClick={sendReceipt} disabled={saving} className="min-h-12"><Upload className="h-4 w-4" />{saving ? (ar ? "جارٍ الإرسال..." : "Sending...") : copy.upload}</Button></div>}{step !== "receipt" && <Button type="submit" className="mt-6 min-h-12">{step === "payment" ? copy.confirm : copy.next}</Button>}</form>
      <aside className="h-fit rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5 lg:sticky lg:top-24"><h2 className="text-xl font-black text-[var(--text)]">{copy.summary}</h2><div className="mt-4 grid gap-3">{items.map((item) => <div key={item.id} className="rounded-xl bg-[var(--page)] p-3"><p className="font-black text-[var(--text)]">{ar ? item.nameAr : item.name}</p><p className="mt-1 text-xs font-bold text-[var(--muted-text)]">{ar ? item.optionAr : item.option} ×{item.quantity}</p><p className="mt-2 font-black text-[#C54E00]">{formatPriceDZD(item.price * item.quantity, locale)}</p></div>)}</div><div className="mt-4 flex justify-between border-t border-[var(--border-color)] pt-4 font-black text-[var(--text)]"><span>{copy.total}</span><span className="text-[#C54E00]">{formatPriceDZD(total, locale)}</span></div><Button asChild variant="ghost" className="mt-4 w-full"><Link href="/cart">{copy.back}</Link></Button></aside>
    </div></div></main>;
}

function Field({ label, value, onChange, required, type = "text", textarea, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; textarea?: boolean; placeholder?: string }) { return <label className="grid gap-2 text-sm font-bold text-[var(--text)]">{label}{textarea ? <textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-28 rounded-xl border border-[var(--border-color)] bg-[var(--page)] px-4 py-3 text-base text-[var(--text)]" /> : <input value={value} onChange={(event) => onChange(event.target.value)} required={required} type={type} placeholder={placeholder} className="min-h-12 rounded-xl border border-[var(--border-color)] bg-[var(--page)] px-4 text-base text-[var(--text)]" />}</label>; }
