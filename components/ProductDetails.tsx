"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { categorySlug } from "@/lib/categories";
import { formatDzd } from "@/lib/currency";
import { addCartItem, createCartItem } from "@/lib/cart";
import { Product, ProductPriceOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { productFaqEntries, t } from "@/lib/i18n";
import { useLocale } from "@/lib/useLocale";
import { trackViewContent } from "@/lib/meta-pixel";
import { StockAlertForm } from "@/components/StockAlertForm";
import { detailValue, optionValue, productValue, translateSupport } from "@/lib/product-localization";

type Offer = ProductPriceOption & { key: string };
const money = formatDzd;

export function ProductDetails({ product }: { product: Product }) {
  const { locale } = useLocale();
  const offers = useMemo<Offer[]>(() => (product.priceOptions?.length ? product.priceOptions : [{ id: `${product.id}:default`, label: product.duration || "Standard", labelAr: product.durationAr || "Standard", price: product.price, duration: product.duration, durationAr: product.durationAr, available: product.available }]).map((offer) => ({ ...offer, key: offer.id })), [product]);
  const [selectedKey, setSelectedKey] = useState(offers[0]?.key ?? "default");
  const [added, setAdded] = useState(false);
  const selected = offers.find((offer) => offer.key === selectedKey) ?? offers[0];
  const unavailable = !product.available || !selected || selected.available === false;
  const details = product.details;
  useEffect(() => { trackViewContent({ id: product.id, name: product.name, category: product.category, price: selected?.price ?? product.price }); }, [product, selected?.price]);
  const info = [
    [t(locale, "duration"), selected && optionValue(selected, locale, "duration")], [t(locale, "compatibility"), selected && (optionValue(selected, locale, "compatibility") || detailValue(details, locale, "compatibility"))], [t(locale, "activationType"), detailValue(details, locale, "activation") || productValue(product, locale, "activation")], [t(locale, "activationTime"), t(locale, "activationMessage")], [t(locale, "warranty"), detailValue(details, locale, "warranty")], [t(locale, "accountType"), detailValue(details, locale, "account")], [t(locale, "includedCredits"), detailValue(details, locale, "credits")], [t(locale, "storage"), detailValue(details, locale, "storage")],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const checkoutHref = selected ? `/checkout?product=${encodeURIComponent(product.slug)}&option=${encodeURIComponent(selected.id)}` : "/checkout";
  const isArabic = locale === "ar";
  const actionCopy = isArabic ? { add: "أضف إلى السلة", added: "تمت الإضافة إلى السلة", payment: "الدفع والتفعيل", paymentBody: "اختر الخطة، أكمل بيانات الطلب، ثم حوّل المبلغ وارفع وصل الدفع. يبدأ التفعيل بعد تأكيد الدفع.", policy: "الضمان والاسترجاع", policyBody: "إذا كان الخلل من طرف Tiger Store ومشمولاً بالضمان، نحاول الاستبدال أولاً. إذا تعذّر ذلك، يُحسب استرجاع الجزء غير المستعمل من الضمان بالدينار الصحيح. المشاكل الناتجة عن العميل غير مشمولة." } : { add: "Add to cart", added: "Added to cart", payment: "Payment and activation", paymentBody: "Choose the plan, complete the order details, then transfer and upload the receipt. Activation begins after payment verification.", policy: "Warranty and refunds", policyBody: "For a Tiger Store-caused covered failure, we attempt replacement first. If impossible, the unused covered period is refunded proportionally in whole DZD. Customer-caused problems are excluded." };
  function addSelectedToCart() { if (!selected || unavailable) return; addCartItem(createCartItem(product, selected)); setAdded(true); }
  return <section className="space-y-8" dir={locale === "ar" ? "rtl" : "ltr"}>
    <nav className="text-sm font-bold text-[#5F6368]"><Link href="/" className="hover:text-[#C54E00]">{t(locale, "home")}</Link><span className="mx-2">/</span><Link href={`/categories/${categorySlug(product.category)}`} className="hover:text-[#C54E00]">{locale === "ar" ? product.categoryAr : product.category}</Link><span className="mx-2">/</span><span className="text-[#151515]" dir="auto">{locale === "ar" ? product.nameAr : product.name}</span></nav>
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface)]"><div className="relative aspect-[4/5]"><Image src={product.image} alt={`${locale === "ar" ? product.nameAr : product.name} — ${t(locale, "productArtwork")}`} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain p-3" /></div></div>
      <aside className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-5 text-[var(--text)] sm:p-7">
        <p className="text-sm font-bold text-[#75511f]">{locale === "ar" ? product.categoryAr : product.category}</p>
        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl" dir="auto">{locale === "ar" ? product.nameAr : product.name}</h1>
        <p className="mt-4 text-base font-medium leading-7 text-black/65">{productValue(product, locale, "description")}</p>
        {offers.length > 1 && <div className="mt-7"><h2 className="text-sm font-black tracking-[.14em] text-[var(--muted-text)]">{t(locale, "chooseDuration")}</h2><div className="mt-3 grid gap-3">{offers.map((offer) => { const active = selectedKey === offer.key; return <button key={offer.key} type="button" disabled={offer.available === false} onClick={() => setSelectedKey(offer.key)} className={cn("product-option flex min-h-16 items-center justify-between gap-3 rounded-md border p-4 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tiger-ember disabled:cursor-not-allowed disabled:opacity-45", active && "product-option--active")}><span className="flex items-center gap-3"><span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", active ? "border-tiger-ember bg-tiger-ember text-black" : "border-[var(--border-color)]")}>{active && <Check className="h-3.5 w-3.5" />}</span><span><span className="block font-black text-[var(--text)]">{optionValue(offer, locale, "duration")}</span>{optionValue(offer, locale, "compatibility") && <span className="mt-0.5 block text-xs font-bold text-[var(--muted-text)]">{optionValue(offer, locale, "compatibility")}</span>}</span></span><span className="font-black text-[#d85b00]" dir="ltr">{money(offer.price)}</span></button>; })}</div></div>}
        <div className="mt-7 border-y border-black/10 py-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black tracking-[.14em] text-black/55">{t(locale, "price")}</p><p className="mt-1 text-3xl font-black text-[#d85b00]">{selected && selected.price > 0 ? money(selected.price) : t(locale, "priceUnavailable")}</p></div><p className={`text-sm font-black ${unavailable ? "text-black/45" : "text-emerald-700"}`}>{unavailable ? t(locale, "outOfStock") : t(locale, "inStock")}</p></div></div>
        <div className="mt-5 grid gap-3">{info.map(([label, content]) => <div key={label} className="flex items-start justify-between gap-5 text-sm"><span className="shrink-0 font-bold text-black/50">{label}</span><span className="text-end font-bold leading-6">{content}</span></div>)}</div>
        {detailValue(details, locale, "notice") && <p className="mt-5 border-s-2 border-tiger-ember ps-3 text-sm font-bold leading-6 text-black/70">{detailValue(details, locale, "notice")}</p>}
        {unavailable ? <><Button disabled className="mt-7 min-h-12 w-full rounded-full">{t(locale, "outOfStock")}</Button><StockAlertForm productSlug={product.slug} optionId={selected?.id} /></> : <div className="mt-7 grid gap-2 sm:grid-cols-2"><Button type="button" onClick={addSelectedToCart} variant="secondary" className="min-h-12 rounded-full">{added ? actionCopy.added : actionCopy.add}</Button><Button asChild className="min-h-12 rounded-full"><Link href={checkoutHref}>{t(locale, "buyNow")}</Link></Button></div>}
      </aside>
    </div>
    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-5 sm:p-7"><h2 className="text-2xl font-black text-[var(--text)]">{t(locale, "productDetails")}</h2><ul className="mt-5 grid gap-3 sm:grid-cols-2">{(locale === "ar" ? product.featuresAr : product.featuresEn).map((feature) => <li key={feature} className="flex items-center gap-3 text-sm font-bold leading-6 text-[var(--text)]"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#C54E00]" />{translateSupport(feature, locale)}</li>)}</ul></section>
    <section className="grid gap-4 rounded-xl border border-[var(--border-color)] bg-[#FFF2E6] p-5 sm:grid-cols-2 sm:p-7"><article><h2 className="text-lg font-black text-[var(--text)]">{actionCopy.payment}</h2><p className="mt-2 text-sm font-semibold leading-7 text-[var(--muted-text)]">{actionCopy.paymentBody}</p></article><article><h2 className="text-lg font-black text-[var(--text)]">{actionCopy.policy}</h2><p className="mt-2 text-sm font-semibold leading-7 text-[var(--muted-text)]">{actionCopy.policyBody}</p></article></section>
    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-5 sm:p-7"><h2 className="text-2xl font-black text-[var(--text)]">{t(locale, "productFaq")}</h2><div className="mt-5 grid gap-3">{productFaqEntries(locale, product.name, product.nameAr).map((faq) => <details key={faq.question} className="border-b border-[var(--border-color)] pb-4"><summary className="cursor-pointer font-black text-[var(--text)]">{faq.question}</summary><p className="mt-3 text-sm font-semibold leading-7 text-[var(--muted-text)]">{faq.answer}</p></details>)}</div></section>
  </section>;
}
