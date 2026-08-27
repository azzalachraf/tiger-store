import defaultCategories from "@/data/categories.json";
import type { Category, Product } from "@/lib/types";

export function categorySlug(id: string) {
  return id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getSiteCategories(products: Product[] = []): Category[] {
  const categories = new Map<string, Category>();

  if (!products.length) {
    for (const category of defaultCategories as Category[]) {
      categories.set(category.id, category);
    }
  }

  for (const product of products) {
    if (!product.category || categories.has(product.category)) continue;

    categories.set(product.category, {
      id: product.category,
      name: {
        ar: product.categoryAr || product.category,
        en: product.category,
      },
    });
  }

  return Array.from(categories.values());
}
