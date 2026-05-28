"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { useLocale } from "@/lib/useLocale";
import { submitOrderAction } from "@/app/checkout/actions";

const paymentMethods: PaymentMethodId[] = ["BaridiMob", "CCP", "RedotPay"];

type CheckoutViewProps = {
  products: Product[];
  directProductSlug?: string;
  directOption?: string;
  directPrice?: number;
  settings: SiteSettings;
};

export function CheckoutView({ products, directProductSlug, directOption, directPrice, settings }: CheckoutViewProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>("BaridiMob");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const { currency } = useCurrency();
  const { locale } = useLocale();
  const labels = locale === "ar"
    ? {
        eyebrow: "إتمام الطلب",
        title: "إكمال الطلب",
        description: "أدخل معلوماتك، اختر طريقة الدفع، ثم أكد الطلب.",
        customerInfo: "معلومات الزبون",
        fullName: "الاسم الكامل",
        phone: "رقم الهاتف",
        email: "البريد الإلكتروني للتفعيل",
        notes: "ملاحظات",
        notesPlaceholder: "تفاصيل إضافية اختيارية...",
        paymentMethod: "طريقة الدفع",
        paymentLater: "سيتم تأكيد تفاصيل الدفع بعد إرسال الطلب.",
        summary: "ملخص الطلب",
        total: "المجموع",
        confirm: "تأكيد الطلب",
        clear: "تفريغ السلة",
        back: "العودة للسلة",
        empty: "السلة فارغة.",
        browse: "تصفح المنتجات",
      }
    : {
        eyebrow: "Checkout",
        title: "Checkout",
        description: "Enter your details, choose a payment method, and confirm your order.",
        customerInfo: "Customer Information",
        fullName: "Full Name",
        phone: "Phone Number",
        email: "Activation Email",
        notes: "Notes",
        notesPlaceholder: "Optional details...",
        paymentMethod: "Payment Method",
        paymentLater: "Payment details will be confirmed after order submission.",
        summary: "Order Summary",
        total: "Total",
        confirm: "Confirm Order",
        clear: "Clear Cart",
        back: "Back to Cart",
        empty: "Your cart is empty.",
        browse: "Browse Products",
      };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = readCart();

      if (!current.length && directProductSlug) {
        const product = products.find((entry) => entry.slug === directProductSlug);
        const offer = product
          ? getProductOffers(product).find((entry) => entry.label === directOption || entry.price === directPrice) ??
            getProductOffers(product)[0]
          : undefined;

        if (product && offer) {
          addCartItem(createCartItem(product, offer));
        }
      }

      setItems(readCart());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [directOption, directPrice, directProductSlug, products]);

  const total = useMemo(() => getCartSubtotal(items), [items]);

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
      id: `local-${Date.now()}`,
      createdAt: new Date().toISOString(),
      items,
      total,
      paymentMethod,
      customer: { name, phone, email, notes: notes || undefined },
      status: "submitted",
      source: "localStorage",
    };

    saveLocalOrder(order);

    try {
      await submitOrderAction({
        customerName: name,
        phone,
        email,
        products: items,
        paymentMethod,
        total,
        notes: notes || undefined,
      });
    } catch (error) {
      console.error("Failed to save order to Supabase:", error);
    }

    const productLines = items
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
      `Total: ${formatPriceDZD(total, locale, currency)}`,
      currency === "USD" ? `DZD total: ${formatPriceDZD(total, locale)}` : null,
      `Payment Method: ${paymentMethod}`,
      "",
      "Customer:",
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Activation Email: ${email}`,
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
    <main className="store-shell min-h-screen px-3 py-6 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-6xl">
      <div className="store-panel mb-5 rounded-md p-5 sm:p-7">
        <p className="text-sm font-black text-tiger-gold">{labels.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">{labels.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60">
          {labels.description}
        </p>
      </div>

      {items.length ? (
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            <div className="store-panel rounded-md p-4">
              <h2 className="mb-4 text-xl font-black text-white">{labels.customerInfo}</h2>
              <div className="grid gap-4">
                <Field label={labels.fullName} value={name} onChange={setName} required autoComplete="name" />
                <Field label={labels.phone} value={phone} onChange={setPhone} required inputMode="tel" autoComplete="tel" />
                <Field label={labels.email} value={email} onChange={setEmail} required type="email" autoComplete="email" />
                <label className="grid gap-2 text-sm font-bold text-white">
                  {labels.notes}
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="min-h-24 rounded-xl border border-white/10 bg-black px-4 py-3 text-base text-white outline-none placeholder:text-white/35 focus:border-tiger-ember"
                    placeholder={labels.notesPlaceholder}
                  />
                </label>
              </div>
            </div>

            <div className="store-panel rounded-md p-4">
              <h2 className="mb-4 text-xl font-black text-white">{labels.paymentMethod}</h2>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`min-h-12 rounded-xl border px-2 text-xs font-black transition-colors duration-150 sm:text-sm ${
                      paymentMethod === method
                        ? "border-tiger-ember bg-tiger-ember text-black"
                        : "border-white/10 bg-black/40 text-white"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4 text-sm leading-7 text-white/70">
                {paymentMethod === "BaridiMob" ? (
                  <p>
                    RIP: <span className="font-black text-tiger-gold">{settings.baridiMobRip}</span>
                  </p>
                ) : (
                  <p>{labels.paymentLater}</p>
                )}
              </div>
            </div>
          </div>

          <aside className="store-panel h-fit rounded-md p-4">
            <h2 className="mb-4 text-xl font-black text-white">{labels.summary}</h2>
            <div className="grid gap-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-black/40 p-3">
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
            <Button type="submit" className="mt-4 w-full min-h-12">
              {labels.confirm}
            </Button>
            <Button type="button" onClick={clearCart} variant="secondary" className="mt-2 w-full min-h-12">
              {labels.clear}
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full min-h-12">
              <Link href="/cart">{labels.back}</Link>
            </Button>
          </aside>
        </form>
      ) : (
        <div className="store-panel rounded-md p-6 text-center">
          <p className="font-bold text-white">{labels.empty}</p>
          <Button asChild className="mt-4 min-h-12">
            <Link href="/shop">{labels.browse}</Link>
          </Button>
        </div>
      )}
      </div>
    </main>
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
        className="min-h-12 rounded-xl border border-white/10 bg-black px-4 text-base text-white outline-none placeholder:text-white/35 focus:border-tiger-ember"
      />
    </label>
  );
}
