import type { Product } from "@/lib/types";

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
}

export function findCatalogProducts(products: Product[], query: string) {
  const needle = normalized(query);
  if (!needle) return products;

  return products.filter((product) => [product.name, product.nameAr, product.slug, product.category, product.categoryAr]
    .map(normalized)
    .some((value) => value.startsWith(needle) || value.split(/[\s-]+/).some((word) => word.startsWith(needle))));
}
