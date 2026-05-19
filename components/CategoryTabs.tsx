import { Category, Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";

type CategoryTabsProps = {
  categories: Category[];
  products: Product[];
};

export function CategoryTabs({ categories, products }: CategoryTabsProps) {
  return (
    <section id="products" className="mx-auto max-w-7xl px-3 py-10 sm:px-5 lg:px-8">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-bold text-tiger-gold">المنتجات</p>
          <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
            اختر اشتراكك الرقمي
          </h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <a
              key={category.id}
              href={category.id === "all" ? "/shop" : `/shop?category=${encodeURIComponent(category.id)}`}
              className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white/75 transition-colors duration-150 hover:bg-white/10 hover:text-white"
            >
              {category.name.ar}
            </a>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
