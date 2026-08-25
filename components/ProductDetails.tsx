"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { categorySlug } from "@/lib/categories";
import { formatDzd } from "@/lib/currency";
import { Product, ProductPriceOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { trackViewContent } from "@/lib/meta-pixel";

type Offer = ProductPriceOption & { key: string };
const money = formatDzd;

export function ProductDetails({ product }: { product: Product }) {
  const offers = useMemo<Offer[]>(() => (product.priceOptions?.length ? product.priceOptions : [{ label: product.duration || "Standard", labelAr: product.durationAr || "Standard", price: product.price, duration: product.duration, durationAr: product.durationAr, available: product.available }]).map((offer) => ({ ...offer, key: offer.label })), [product]);
  const [selectedKey, setSelectedKey] = useState(offers[0]?.key ?? "default");
  const selected = offers.find((offer) => offer.key === selectedKey) ?? offers[0];
  const unavailable = !product.available || !selected || selected.available === false;
  const details = product.details;
  useEffect(() => { trackViewContent({ id: product.id, name: product.name, category: product.category, price: selected?.price ?? product.price }); }, [product, selected?.price]);
  const info = [
    ["Duration", selected?.duration], ["Device compatibility", selected?.compatibilityEn || details?.compatibilityEn], ["Activation type", details?.activationMethodEn || product.activationTypeEn], ["Activation time", details?.activationTimeEn], ["Warranty", details?.warrantyEn], ["Account type", details?.accountTypeEn], ["Included credits", details?.creditsEn], ["Storage", details?.storageEn],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const checkoutHref = selected ? `/checkout?product=${encodeURIComponent(product.slug)}&option=${encodeURIComponent(selected.label)}` : "/checkout";
  return <section className="space-y-8" dir="ltr">
    <nav className="text-sm font-bold text-[#5F6368]"><Link href="/" className="hover:text-[#C54E00]">Home</Link><span className="mx-2">/</span><Link href={`/categories/${categorySlug(product.category)}`} className="hover:text-[#C54E00]">{product.category}</Link><span className="mx-2">/</span><span className="text-[#151515]">{product.name}</span></nav>
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="overflow-hidden rounded-xl border border-[#D9D7D2] bg-white"><div className="relative aspect-[4/5]"><Image src={product.image} alt={`${product.name} product artwork`} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain p-3" /></div></div>
      <aside className="rounded-xl border border-[#D9D7D2] bg-white p-5 text-[#151515] shadow-[0_8px_24px_rgba(21,21,21,.06)] sm:p-7">
        <p className="text-sm font-bold text-[#75511f]">{product.category}</p>
        <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">{product.name}</h1>
        <p className="mt-4 text-base font-medium leading-7 text-black/65">{product.shortDescriptionEn}</p>
        {offers.length > 1 && <div className="mt-7"><h2 className="text-sm font-black uppercase tracking-[.14em] text-black/55">Choose duration</h2><div className="mt-3 grid gap-3">{offers.map((offer) => { const active = selectedKey === offer.key; return <button key={offer.key} type="button" disabled={offer.available === false} onClick={() => setSelectedKey(offer.key)} className={cn("flex min-h-16 items-center justify-between gap-3 rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tiger-ember disabled:cursor-not-allowed disabled:opacity-45", active ? "border-tiger-ember bg-white shadow-sm" : "border-black/12 bg-transparent hover:border-black/30")}><span className="flex items-center gap-3"><span className={cn("flex h-5 w-5 items-center justify-center rounded-full border", active ? "border-tiger-ember bg-tiger-ember text-black" : "border-black/25")}>{active && <Check className="h-3.5 w-3.5" />}</span><span><span className="block font-black">{offer.duration}</span>{offer.compatibilityEn && <span className="mt-0.5 block text-xs font-bold text-black/55">{offer.compatibilityEn}</span>}</span></span><span className="font-black text-[#d85b00]">{money(offer.price)}</span></button>; })}</div></div>}
        <div className="mt-7 border-y border-black/10 py-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] text-black/55">Price</p><p className="mt-1 text-3xl font-black text-[#d85b00]">{selected && selected.price > 0 ? money(selected.price) : "Price unavailable"}</p></div><p className={`text-sm font-black ${unavailable ? "text-black/45" : "text-emerald-700"}`}>{unavailable ? "Out of stock" : "In stock"}</p></div></div>
        <div className="mt-5 grid gap-3">{info.map(([label, content]) => <div key={label} className="flex items-start justify-between gap-5 text-sm"><span className="shrink-0 font-bold text-black/50">{label}</span><span className="text-right font-bold leading-6">{content}</span></div>)}</div>
        {details?.noticeEn && <p className="mt-5 border-l-2 border-tiger-ember pl-3 text-sm font-bold leading-6 text-black/70">{details.noticeEn}</p>}
        {unavailable ? <Button disabled className="mt-7 min-h-12 w-full rounded-full">Out of stock</Button> : <Button asChild className="mt-7 min-h-12 w-full rounded-full"><Link href={checkoutHref}>Buy Now</Link></Button>}
      </aside>
    </div>
    <section className="rounded-xl border border-[#D9D7D2] bg-white p-5 sm:p-7"><h2 className="text-2xl font-black text-[#151515]">Product details</h2><ul className="mt-5 grid gap-3 sm:grid-cols-2">{product.featuresEn.map((feature) => <li key={feature} className="flex items-center gap-3 text-sm font-bold leading-6 text-[#151515]"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#C54E00]" />{feature}</li>)}</ul></section>
    {product.faqs?.length ? <section className="rounded-xl border border-[#D9D7D2] bg-white p-5 sm:p-7"><h2 className="text-2xl font-black text-[#151515]">Frequently asked questions</h2><div className="mt-5 grid gap-3">{product.faqs.map((faq) => <details key={faq.questionEn} className="border-b border-[#D9D7D2] pb-4"><summary className="cursor-pointer font-black text-[#151515]">{faq.questionEn}</summary><p className="mt-3 text-sm font-semibold leading-7 text-[#5F6368]">{faq.answerEn}</p></details>)}</div></section> : null}
  </section>;
}
