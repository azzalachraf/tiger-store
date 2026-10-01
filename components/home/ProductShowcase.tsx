"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import type { HomeProduct } from "./products";
import type { Locale } from "@/lib/types";
import styles from "./landing.module.css";

export type ShowcaseProduct = HomeProduct & { artwork: string; caption: string; warranty?: string; displayName: string };
type Labels = { offers: string; available: string; unavailable: string };

export function ProductShowcase({ products, locale, labels }: { products: ShowcaseProduct[]; locale: Locale; labels: Labels }) {
  // Deliberately no timer or persisted slide: Snapchat is index zero on every mount.
  const [index, setIndex] = useState(0);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const rtl = locale === "ar";
  const controls = {
    ar: { previous: "المنتج السابق", next: "المنتج التالي", region: "استعراض المنتجات", select: "عرض" },
    en: { previous: "Previous product", next: "Next product", region: "Product showcase", select: "Show" },
    fr: { previous: "Produit précédent", next: "Produit suivant", region: "Sélection de produits", select: "Voir" },
  }[locale];
  if (!products.length) return null;
  const featured = products[index];
  const move = (step: number) => setIndex(current => (current + step + products.length) % products.length);
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.3) move((dx < 0 ? 1 : -1) * (rtl ? -1 : 1));
  };

  return <article className={styles.floatingShowcase} data-featured={featured.slug} aria-label={controls.region} aria-roledescription="carousel">
    <div className={styles.swipeStage} tabIndex={0} role="group" aria-label={controls.region}
      onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { pointer.current = null; }}
      onKeyDown={event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          move((event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1));
        }
      }}>
      {products.map((product, position) => {
        const relative = (position - index + products.length) % products.length;
        if (relative !== 0 && relative !== 1 && relative !== products.length - 1) return null;
        const side = relative === 0 ? "center" : relative === 1 ? (rtl ? "left" : "right") : (rtl ? "right" : "left");
        return <div key={product.id} className={styles.floatingSlot} data-position={side}>
          <div className={styles.floatingCard}>
            <Image src={product.artwork} alt={product.name} fill sizes="(min-width:768px) 280px, 200px" priority={position === 0} draggable={false} className={styles.artwork} />
          </div>
        </div>;
      })}
      {products.length > 1 && <>
        <button className={styles.showcaseArrow} data-side="left" type="button" onClick={() => move(rtl ? 1 : -1)} aria-label={rtl ? controls.next : controls.previous}><ChevronLeft size={18} /></button>
        <button className={styles.showcaseArrow} data-side="right" type="button" onClick={() => move(rtl ? -1 : 1)} aria-label={rtl ? controls.previous : controls.next}><ChevronRight size={18} /></button>
      </>}
    </div>
    <div className={styles.showcaseDetails} aria-live="polite" aria-atomic="true">
      <p className={styles.offerKicker}>{featured.caption}</p>
      <h2 dir="auto">{featured.displayName}</h2>
      <div className={styles.offerSummary}>
        <p className={styles.offerDuration}>{featured.duration}</p>
        <strong className={styles.offerPrice} dir="ltr">{featured.price}</strong>
      </div>
      <p className={styles.offerWarranty}>{featured.warranty || "\u00a0"}</p>
      <span className={styles.offerAvailability}>{featured.available ? labels.available : labels.unavailable}</span>
      <Link href={featured.href} prefetch={false} className={styles.offerButton}>{labels.offers}<ArrowUpRight size={16} aria-hidden="true" /></Link>
    </div>
    {products.length > 1 && <div className={styles.showcaseDots} dir="ltr"><span className={styles.slideCount}>{index + 1} / {products.length}</span></div>}
  </article>;
}
