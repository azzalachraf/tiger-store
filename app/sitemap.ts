import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/admin-store";
import { categorySlug, getSiteCategories } from "@/lib/categories";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const categories = getSiteCategories(products).filter((category) => category.id !== "all");

  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/categories"), changeFrequency: "weekly", priority: 0.8 },
    ...categories.map((category) => ({
      url: absoluteUrl(`/categories/${categorySlug(category.id)}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`/products/${product.slug}`),
      changeFrequency: "weekly" as const,
      priority: product.featured ? 0.8 : 0.6,
    })),
    { url: absoluteUrl("/payment-methods"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/faq"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/privacy-policy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/refund-policy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms-and-conditions"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
