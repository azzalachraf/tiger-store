"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartItem, LocalOrder, PaymentMethodId, Product, SiteSettings } from "@/lib/types";
import {
  addCartItem,
  createCartItem,
  getCartSubtotal,
  getProductOffers,
  ORDERS_STORAGE_KEY,
  readCart,
  writeCart,
} from "@/lib/cart";
import { formatPriceDZD } from "@/lib/utils";
import { useCurrency } from "@/lib/useCurrency";
import { submitOrderAction } from "@/app/checkout/actions";
import { trackInitiateCheckout, trackPurchase } from "@/lib/meta-pixel";
import { readStoredUtm } from "@/components/PageTracker";
import { useLocale } from "@/lib/useLocale";

const paymentMethods: PaymentMethodId[] = ["BaridiMob", "CCP", "RedotPay"];
type CheckoutViewProps = {
  products: Product[];
  directProductSlug?: string;
  directOption?: string;
  settings: SiteSettings;
};

export function CheckoutView({ products, directProductSlug, directOption, settings }: CheckoutViewProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("BaridiMob");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const { currency } = useCurrency();
  const { locale } = useLocale();
  const labels = locale === "ar"
    ? {
        eyebrow: "إتمام الطلب",
        title: "أكمل الطلب وسنؤكد معك عبر واتساب",
        description: "املأ معلوماتك، اختر طريقة الدفع، ثم سيتم فتح واتساب برسالة الطلب حتى نراجع التفاصيل ونكمل التفعيل.",
        customerInfo: "معلومات الزبون",
        fullName: "الاسم الكامل",
        phone: "رقم الهاتف",
        notes: "ملاحظات",
        notesPlaceholder: "مثال: أريد التفعيل على حسابي، أو الوقت المناسب للتواصل...",
        paymentMethod: "طريقة الدفع",
        paymentLater: "سيتم تأكيد تفاصيل الدفع بعد إرسال الطلب.",
        summary: "ملخص الطلب",
        total: "المجموع",
        confirm: "تأكيد الطلب عبر واتساب",
        clear: "تفريغ السلة",
        back: "العودة للسلة",
        empty: "السلة فارغة.",
        browse: "تصفح المنتجات",
        stepOne: "معلوماتك",
        stepTwo: "طريقة الدفع",
        stepThree: "تأكيد واتساب",
        reassurance: "لا يتم الدفع داخل الموقع. نراجع الطلب أولا ثم نرسل لك التفاصيل المناسبة.",
        support: "دعم بعد الطلب",
        secure: "مراجعة قبل الدفع",
        local: "دفع محلي",
      }
    : {
        eyebrow: "Checkout",
        title: "Complete your order and continue on WhatsApp",
        description: "Enter your details, choose a payment method, then WhatsApp opens with the order message so we can review and activate it.",
        customerInfo: "Customer information",
        fullName: "Full name",
        phone: "Phone number",
        notes: "Notes",
        notesPlaceholder: "Example: activate on my account, or preferred contact time...",
        paymentMethod: "Payment method",
        paymentLater: "Payment details will be confirmed after order submission.",
        summary: "Order summary",
        total: "Total",
        confirm: "Confirm on WhatsApp",
        clear: "Clear cart",
        back: "Back to cart",
        empty: "Your cart is empty.",
        browse: "Browse products",
        stepOne: "Your details",
        stepTwo: "Payment",
        stepThree: "WhatsApp confirm",
        reassurance: "Payment is not collected inside the website. We review the order first and send the right payment details.",
        support: "After-order support",
        secure: "Review before payment",
        local: "Local payment",
      };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = readCart();

      if (!current.length && directProductSlug) {
        const product = products.find((entry) => entry.slug === directProductSlug);
        const offer = product
          ? getProductOffers(product).find((entry) => entry.label === directOption) ??
            getProductOffers(product)[0]
          : undefined;

        if (product && offer) {
          addCartItem(createCartItem(product, offer));
        }
      }

      setItems(readCart());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [directOption, directProductSlug, products]);

  const total = useMemo(() => getCartSubtotal(items), [items]);

  useEffect(() => {
    if (items.length > 0) {
      trackInitiateCheckout(getCartSubtotal(items), items.length);
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: "checkout_started", ...readStoredUtm() }),
      }).catch(() => {});
    }
  }, [items]);

  function saveLocalOrder(order: LocalOrder) {
    try {
      const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
      const existing = raw ? (JSON.parse(raw) as LocalOrder[]) : [];
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([order, ...existing]));
    } catch {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([order]));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) return;

    const order: LocalOrder = {
      id: `local-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      items,
      total,
      paymentMethod,
      customer: { name, phone, email: phone, notes: notes || undefined },
      status: "submitted",
      source: "localStorage",
    };

    const purchaseEventId = trackPurchase(order.id, total, items.map((i) => ({ id: i.productId })));
    const utm = readStoredUtm();
    let authoritative = { products: items, total };

    try {
      authoritative = await submitOrderAction({
        customerName: name,
        phone,
        email: phone,
        products: items,
        paymentMethod,
        total,
        notes: notes || undefined,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
        eventId: purchaseEventId,
      });
      saveLocalOrder({ ...order, items: authoritative.products, total: authoritative.total });
    } catch (error) {
      console.error("Failed to save order to Supabase:", error);
      return;
    }

    const productLines = authoritative.products
      .map(
        (item) =>
          `- ${item.name} | ${item.option} | Qty: ${item.quantity} | Price: ${formatPriceDZD(item.price * item.quantity, locale, currency)}`,
      )
      .join("\n");

    const message = [
      "New Tiger Store order.",
      "",
      "Order:",
      productLines,
      "",
      `Total: ${formatPriceDZD(authoritative.total, locale, currency)}`,
      currency === "USD" ? `DZD total: ${formatPriceDZD(authoritative.total, locale)}` : null,
      `Payment Method: ${paymentMethod}`,
      "",
      "Customer:",
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Notes: ${notes || "None"}`,
      "",
      "Website: digitaldz.shop",
    ].filter(Boolean).join("\n");

    const destinationNumber = settings.whatsappNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${destinationNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function clearCart() {
    writeCart([]);
    setItems([]);
  }

  return (
    <main className="store-shell min-h-screen px-3 py-6 sm:px-5 lg:px-8" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-6xl">
        <div className="premium-card motion-reveal mb-5 rounded-md p-5 sm:p-7">
          <p className="text-sm font-black text-tiger-gold">{labels.eyebrow}</p>
          <h1 className="mt-2 max-w-3xl text-2xl font-black leading-tight text-white sm:text-4xl">{labels.title}</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-white/62">
            {labels.description}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Step label={labels.stepOne} index={1} />
            <Step label={labels.stepTwo} index={2} />
            <Step label={labels.stepThree} index={3} />
          </div>
        </div>

        {items.length ? (
          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <div className="grid gap-4">
              <div className="premium-card motion-reveal rounded-md p-4 sm:p-5">
                <h2 className="mb-4 text-xl font-black text-white">{labels.customerInfo}</h2>
                <div className="grid gap-4">
                  <Field label={labels.fullName} value={name} onChange={setName} required autoComplete="name" />
                  <Field label={labels.phone} value={phone} onChange={setPhone} required inputMode="tel" autoComplete="tel" />
                  <label className="grid gap-2 text-sm font-bold text-white">
                    {labels.notes}
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="min-h-28 rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-base text-white outline-none placeholder:text-white/35 focus:border-tiger-ember"
                      placeholder={labels.notesPlaceholder}
                    />
                  </label>
                </div>
              </div>

              <div className="premium-card motion-reveal rounded-md p-4 sm:p-5">
                <h2 className="mb-4 text-xl font-black text-white">{labels.paymentMethod}</h2>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`tap-feedback min-h-12 rounded-xl border px-2 text-xs font-black transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tiger-ember sm:text-sm ${
                        paymentMethod === method
                          ? "border-tiger-ember bg-tiger-ember text-black"
                          : "border-white/10 bg-black/40 text-white"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-black/35 p-4 text-sm font-bold leading-7 text-white/70">
                  {paymentMethod === "BaridiMob" ? (
                    <p>
                      RIP: <span className="font-black text-tiger-gold">{settings.baridiMobRip}</span>
                    </p>
                  ) : (
                    <p>{labels.paymentLater}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <TrustItem icon={<ShieldCheck className="h-4 w-4" />} text={labels.secure} />
                <TrustItem icon={<MessageCircle className="h-4 w-4" />} text={labels.support} />
                <TrustItem icon={<CreditCard className="h-4 w-4" />} text={labels.local} />
              </div>
            </div>

            <aside className="premium-card motion-reveal h-fit rounded-md p-4 sm:p-5 lg:sticky lg:top-24">
              <h2 className="mb-4 text-xl font-black text-white">{labels.summary}</h2>
              <div className="grid gap-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-black/35 p-3">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-white">{item.name}</p>
                        <p className="mt-1 text-xs font-bold text-white/52">{item.option}</p>
                      </div>
                      <p className="font-bold text-white/70">x{item.quantity}</p>
                    </div>
                    <p className="mt-2 font-black text-tiger-gold">{formatPriceDZD(item.price * item.quantity, locale, currency)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-lg font-black">
                <span className="text-white">{labels.total}</span>
                <span className="text-tiger-gold">{formatPriceDZD(total, locale, currency)}</span>
              </div>
              <div className="mt-4 rounded-xl border border-tiger-ember/20 bg-tiger-ember/10 p-3 text-xs font-bold leading-6 text-white/72">
                {labels.reassurance}
              </div>
              <Button type="submit" className="mt-4 w-full min-h-12 rounded-full">
                <MessageCircle className="h-4 w-4" />
                {labels.confirm}
              </Button>
              <Button type="button" onClick={clearCart} variant="secondary" className="mt-2 w-full min-h-12 rounded-full">
                {labels.clear}
              </Button>
              <Button asChild variant="ghost" className="mt-2 w-full min-h-12 rounded-full">
                <Link href="/cart">{labels.back}</Link>
              </Button>
            </aside>
          </form>
        ) : (
          <div className="premium-card motion-reveal rounded-md p-6 text-center">
            <p className="font-bold text-white">{labels.empty}</p>
            <Button asChild className="mt-4 min-h-12 rounded-full">
              <Link href="/shop">{labels.browse}</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

function Step({ label, index }: { label: string; index: number }) {
  return (
    <div className="motion-card flex items-center gap-3 rounded-md border border-white/8 bg-white/[0.035] p-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tiger-ember text-xs font-black text-black">{index}</span>
      <span className="text-sm font-black text-white/82">{label}</span>
      <CheckCircle2 className="ms-auto h-4 w-4 text-tiger-gold" />
    </div>
  );
}

function TrustItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="motion-card flex min-h-12 items-center gap-2 rounded-md border border-white/8 bg-black/20 px-3 text-xs font-black text-white/70">
      <span className="text-tiger-gold">{icon}</span>
      {text}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  autoComplete?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-white">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="min-h-12 rounded-xl border border-white/10 bg-black/45 px-4 text-base text-white outline-none placeholder:text-white/35 focus:border-tiger-ember"
      />
    </label>
  );
}
