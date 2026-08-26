"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CartItem, Product } from "@/lib/types";
import { createCartItem, getCartSubtotal, getProductOffers, readCart, writeCart } from "@/lib/cart";
import { formatPriceDZD } from "@/lib/utils";
import { useCurrency } from "@/lib/useCurrency";
import { useLocale } from "@/lib/useLocale";

type CartViewProps = {
  products: Product[];
};
export function CartView({ products }: CartViewProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { currency } = useCurrency();
  const { locale } = useLocale();
  const labels = locale === "ar"
    ? {
        eyebrow: "السلة",
        title: "راجع طلبك قبل التأكيد",
        description: "تأكد من المنتج والخطة والكمية. الدفع لا يتم داخل الموقع، سنكمل معك عبر واتساب.",
        subtotal: "المجموع الفرعي",
        checkout: "إتمام الطلب",
        continue: "متابعة التسوق",
        empty: "السلة فارغة.",
        browse: "تصفح المنتجات",
        remove: "حذف المنتج",
        trust: "مراجعة الطلب قبل إرسال تفاصيل الدفع",
      }
    : {
        eyebrow: "Cart",
        title: "Review your order before confirmation",
        description: "Check product, plan, and quantity. Payment is not collected inside the website; we continue on WhatsApp.",
        subtotal: "Subtotal",
        checkout: "Checkout",
        continue: "Continue Shopping",
        empty: "Your cart is empty.",
        browse: "Browse Products",
        remove: "Remove item",
        trust: "Order review before payment details",
      };

  useEffect(() => {
    const timer = window.setTimeout(() => setItems(readCart()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const subtotal = useMemo(() => getCartSubtotal(items), [items]);

  function updateCart(nextItems: CartItem[]) {
    setItems(nextItems);
    writeCart(nextItems);
  }

  function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    updateCart(items.map((item) => (item.id === itemId ? { ...item, quantity } : item)));
  }

  function removeItem(itemId: string) {
    updateCart(items.filter((item) => item.id !== itemId));
  }

  function changeVariant(item: CartItem, optionId: string) {
    const product = products.find((entry) => entry.id === item.productId);
    const offer = product ? getProductOffers(product).find((entry) => entry.id === optionId) : undefined;
    if (!product || !offer) return;

    const replacement = createCartItem(product, offer, item.quantity);
    const withoutCurrent = items.filter((entry) => entry.id !== item.id);
    const existing = withoutCurrent.find((entry) => entry.id === replacement.id);
    const next = existing
      ? withoutCurrent.map((entry) =>
          entry.id === replacement.id ? { ...entry, quantity: entry.quantity + replacement.quantity } : entry,
        )
      : [...withoutCurrent, replacement];

    updateCart(next);
  }

  return (
    <main className="store-shell min-h-screen px-3 py-6 sm:px-5 lg:px-8" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-6xl">
        <div className="premium-card motion-reveal mb-5 rounded-md p-5 sm:p-7">
          <p className="text-sm font-black text-tiger-gold">{labels.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">{labels.title}</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-white/60">{labels.description}</p>
        </div>

        {items.length ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="grid gap-3">
              {items.map((item) => {
                const product = products.find((entry) => entry.id === item.productId);
                const offers = product ? getProductOffers(product) : [];

                return (
                  <article key={item.id} className="motion-card rounded-md border border-white/10 bg-white/[0.045] p-3 shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
                    <div className="grid grid-cols-[86px_1fr] gap-3 sm:grid-cols-[104px_1fr]">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10 bg-black">
                        <Image src={item.image} alt={item.name} fill sizes="104px" className="object-contain p-1" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="truncate font-black text-white">{item.name}</h2>
                            <p className="mt-1 text-xs font-bold text-white/52">{item.option}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="tap-feedback inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/65 hover:border-red-400/40 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                            aria-label={labels.remove}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {offers.length > 1 ? (
                          <select
                            value={item.optionId}
                            onChange={(event) => changeVariant(item, event.target.value)}
                            className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-tiger-ember"
                          >
                            {offers.map((offer) => (
                              <option key={offer.id} value={offer.id}>
                                {offer.label} - {formatPriceDZD(offer.price, locale, currency)}
                              </option>
                            ))}
                          </select>
                        ) : null}

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-xl border border-white/10 bg-black/40">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="tap-feedback h-10 w-10 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tiger-ember"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="mx-auto h-4 w-4" />
                            </button>
                            <span className="min-w-9 text-center font-black text-white">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="tap-feedback h-10 w-10 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tiger-ember"
                              aria-label="Increase quantity"
                            >
                              <Plus className="mx-auto h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-sm font-black text-tiger-gold sm:text-base">
                            {formatPriceDZD(item.price * item.quantity, locale, currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="premium-card h-fit rounded-md p-4 lg:sticky lg:top-24">
              <div className="flex items-center justify-between text-lg font-black">
                <span className="text-white">{labels.subtotal}</span>
                <span className="text-tiger-gold">{formatPriceDZD(subtotal, locale, currency)}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-tiger-ember/20 bg-tiger-ember/10 p-3 text-xs font-bold leading-6 text-white/72">
                <ShieldCheck className="h-4 w-4 shrink-0 text-tiger-gold" />
                {labels.trust}
              </div>
              <Button asChild className="mt-4 w-full min-h-12 rounded-full">
                <Link href="/checkout">{labels.checkout}</Link>
              </Button>
              <Button asChild variant="secondary" className="mt-2 w-full min-h-12 rounded-full">
                <Link href="/shop">{labels.continue}</Link>
              </Button>
            </aside>
          </div>
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
