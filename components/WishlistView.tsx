"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Product } from "@/lib/types";
import { useLocale } from "@/lib/useLocale";
import { readWishlist } from "@/lib/wishlist";

type WishlistViewProps = {
  products: Product[];
};

export function WishlistView({ products }: WishlistViewProps) {
  const [ids, setIds] = useState<string[]>([]);
  const { locale } = useLocale();
  const labels = locale === "ar"
    ? {
        eyebrow: "المفضلة",
        title: "المنتجات المفضلة",
        description: "احتفظ باشتراكاتك المفضلة في مكان واحد.",
        empty: "قائمة المفضلة فارغة.",
        browse: "تصفح المنتجات",
      }
    : {
        eyebrow: "Wishlist",
        title: "Favorite Products",
        description: "Keep your favorite subscriptions in one place.",
        empty: "Your wishlist is empty.",
        browse: "Browse Products",
      };

  useEffect(() => {
    const update = () => setIds(readWishlist());
    update();
    window.addEventListener("tiger-store-wishlist-updated", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("tiger-store-wishlist-updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const wishlistProducts = useMemo(
    () => products.filter((product) => ids.includes(product.id)),
    [ids, products],
  );

  return (
    <main className="store-shell min-h-screen px-3 py-6 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
      <section className="store-panel mb-5 rounded-md p-5 sm:p-7">
        <p className="text-sm font-black text-tiger-gold">{labels.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">{labels.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60">
          {labels.description}
        </p>
      </section>

      {wishlistProducts.length ? (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {wishlistProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      ) : (
        <section className="store-panel rounded-md p-6 text-center">
          <p className="font-bold text-white">{labels.empty}</p>
          <Button asChild className="mt-4 min-h-12">
            <Link href="/shop">{labels.browse}</Link>
          </Button>
        </section>
      )}
      </div>
    </main>
  );
}
