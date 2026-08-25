import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductOffers } from "@/lib/cart";
import { Product } from "@/lib/types";

function formatDzd(value: number) {
  return `${value.toLocaleString("en-US")} DA`;
}

function priceLabel(product: Product) {
  if (product.price <= 0) return "Price unavailable";
  const prices = getProductOffers(product).map((offer) => offer.price).filter((price) => price > 0);
  const low = Math.min(...prices); const high = Math.max(...prices);
  return low === high ? formatDzd(low) : `${low.toLocaleString("en-US")}–${high.toLocaleString("en-US")} DA`;
}

export function ProductCard({ product, compact = false, priority = false }: { product: Product; compact?: boolean; priority?: boolean }) {
  return <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-md border border-white/10 bg-[#1a1a1a] transition-colors hover:border-tiger-ember/45">
    <Link href={`/products/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-[#111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tiger-ember" aria-label={`View ${product.name}`}>
      <Image src={product.image} alt={`${product.name} product artwork`} fill sizes="(min-width: 1280px) 23vw, (min-width: 768px) 31vw, 50vw" className="object-contain p-2 transition-transform duration-200 group-hover:scale-[1.02]" priority={priority} loading={priority ? undefined : "lazy"} />
    </Link>
    <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-4"}`}>
      <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-11 text-base font-black leading-5 text-white hover:text-tiger-gold focus-visible:outline-none focus-visible:text-tiger-gold">{product.name}</Link>
      <p className="mt-3 text-lg font-black text-tiger-gold">{priceLabel(product)}</p>
      <p className={`mt-1 text-sm font-bold ${product.available ? "text-emerald-300" : "text-white/55"}`}>{product.available ? "In stock" : "Out of stock"}</p>
      {product.available ? <Button asChild size="sm" className="mt-4 min-h-11 w-full rounded-full"><Link href={`/products/${product.slug}`}>View product <ArrowUpRight className="h-4 w-4" /></Link></Button> : <Button type="button" size="sm" disabled className="mt-4 min-h-11 w-full rounded-full">Out of stock</Button>}
    </div>
  </article>;
}
