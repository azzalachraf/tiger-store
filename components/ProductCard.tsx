import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductOffers } from "@/lib/cart";
import { formatDzd } from "@/lib/currency";
import { Product } from "@/lib/types";

function priceLabel(product: Product) {
  if (product.price <= 0) return "Price unavailable";
  const prices = getProductOffers(product).map((offer) => offer.price).filter((price) => price > 0);
  const low = Math.min(...prices); const high = Math.max(...prices);
  return low === high ? formatDzd(low) : `${low.toLocaleString("en-US")}–${high.toLocaleString("en-US")} DA`;
}

export function ProductCard({ product, compact = false, priority = false }: { product: Product; compact?: boolean; priority?: boolean }) {
  return <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#D9D7D2] bg-white shadow-[0_6px_18px_rgba(21,21,21,.05)] transition-colors hover:border-[#FF7300]">
    <Link href={`/products/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-[#F6F5F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tiger-ember" aria-label={`View ${product.name}`}>
      <Image src={product.image} alt={`${product.name} product artwork`} fill sizes="(min-width: 1280px) 23vw, (min-width: 768px) 31vw, 50vw" className="object-contain p-2 transition-transform duration-200 group-hover:scale-[1.02]" priority={priority} loading={priority ? undefined : "lazy"} />
    </Link>
    <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-4"}`}>
      <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-11 text-base font-black leading-5 text-[#151515] hover:text-[#C54E00] focus-visible:outline-none">{product.name}</Link>
      <p className="mt-3 text-lg font-black text-[#C54E00]">{priceLabel(product)}</p>
      <p className={`mt-1 text-sm font-bold ${product.available ? "text-[#16803C]" : "text-[#C62828]"}`}>{product.available ? "In stock" : "Out of stock"}</p>
      {product.available ? <Button asChild size="sm" className="mt-4 min-h-11 w-full rounded-full"><Link href={`/products/${product.slug}`}>View product <ArrowUpRight className="h-4 w-4" /></Link></Button> : <Button type="button" size="sm" disabled className="mt-4 min-h-11 w-full rounded-full">Out of stock</Button>}
    </div>
  </article>;
}
