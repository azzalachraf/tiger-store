import { productPriceOptionSchema, productSchema } from "@/lib/validation";
export function parseProductOptions(value: string) {
  const result = productPriceOptionSchema
    .array()
    .parse(JSON.parse(value || "[]"));
  if (new Set(result.map((o) => o.id)).size !== result.length)
    throw new Error("Each plan must have a unique ID.");
  return result.length ? result : undefined;
}
export function parseProductExtra(value: string, key: "details" | "faqs") {
  return productSchema.shape[key].parse(JSON.parse(value || "null"));
}
