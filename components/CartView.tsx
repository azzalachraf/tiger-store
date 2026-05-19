"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
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
        title: "مراجعة السلة",
        description: "راجع المنتجات والمدة قبل إتمام الطلب.",
        subtotal: "المجموع الفرعي",
        checkout: "إتمام الطلب",
        continue: "متابعة التسوق",
        empty: "السلة فارغة.",
        browse: "تصفح المنتجات",
      }
    : {
        eyebrow: "Cart",
        title: "Review Cart",
        description: "Check products and durations before checkout.",
        subtotal: "Subtotal",
        checkout: "Checkout",
        continue: "Continue Shopping",
        empty: "Your cart is empty.",
        browse: "Browse Products",
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

  function changeVariant(item: CartItem, optionLabel: string) {
    const product = products.find((entry) => entry.id === item.productId);
    const offer = product ? getProductOffers(product).find((entry) => entry.label === optionLabel) : undefined;
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
    <main className="store-shell min-h-screen px-3 py-6 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-6xl">
      <div className="store-panel mb-5 rounded-md p-5 sm:p-7">
        <p className="text-sm font-black text-tiger-gold">{labels.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">{labels.title}</h1>
        <p className="mt-2 text-sm text-white/55">{labels.description}</p>
      </div>

      {items.length ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-3">
            {items.map((item) => {
              const product = products.find((entry) => entry.id === item.productId);
              const offers = product ? getProductOffers(product) : [];

              return (
                <article key={item.id} className="store-panel rounded-md p-3">
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
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/65"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {offers.length > 1 ? (
                        <select
                          value={item.option}
                          onChange={(event) => changeVariant(item, event.target.value)}
                          className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-tiger-ember"
                        >
                          {offers.map((offer) => (
                            <option key={offer.label} value={offer.label}>
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
                            className="h-10 w-10 text-white"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="mx-auto h-4 w-4" />
                          </button>
                          <span className="min-w-9 text-center font-black text-white">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-10 w-10 text-white"
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

          <aside className="store-panel h-fit rounded-md p-4">
            <div className="flex items-center justify-between text-lg font-black">
              <span className="text-white">{labels.subtotal}</span>
              <span className="text-tiger-gold">{formatPriceDZD(subtotal, locale, currency)}</span>
            </div>
            <Button asChild className="mt-4 w-full min-h-12">
              <Link href="/checkout">{labels.checkout}</Link>
            </Button>
            <Button asChild variant="secondary" className="mt-2 w-full min-h-12">
              <Link href="/shop">{labels.continue}</Link>
            </Button>
          </aside>
        </div>
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
