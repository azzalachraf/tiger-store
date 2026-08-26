"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteProduct, saveProduct } from "@/lib/admin-store";
import { getSiteCategories } from "@/lib/categories";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { Product, ProductDetails, ProductPriceOption } from "@/lib/types";
import { productPriceOptionSchema } from "@/lib/validation";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function fileExtension(file: File) {
  const byType: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/avif": "avif",
  };

  const extension = byType[file.type];
  if (extension) return extension;

  const nameExtension = file.name.split(".").pop()?.toLowerCase();
  return nameExtension && ["png", "jpg", "jpeg", "webp", "avif"].includes(nameExtension) ? nameExtension : null;
}

function safeFileBase(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "product";
}

async function saveUploadedProductImage(formData: FormData, slug: string) {
  const uploaded = formData.get("imageUpload");
  if (!(uploaded instanceof File) || uploaded.size === 0) return null;

  const maxSize = 4 * 1024 * 1024;
  if (uploaded.size > maxSize) {
    throw new Error("Product image is too large. Please upload an image under 4 MB.");
  }

  const extension = fileExtension(uploaded);
  if (!extension) {
    throw new Error("Unsupported image type. Use PNG, JPG, WEBP, or AVIF.");
  }

  const bytes = Buffer.from(await uploaded.arrayBuffer());
  const filename = `${safeFileBase(slug)}-${Date.now()}.${extension}`;

  const client = getSupabaseServiceClient();
  const { error } = await client.storage
    .from("product-images")
    .upload(filename, bytes, { contentType: uploaded.type, upsert: true });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data: urlData } = client.storage
    .from("product-images")
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseVariants(value: string): ProductPriceOption[] | undefined {
  try {
    const parsed = JSON.parse(value) as ProductPriceOption[];
    const variants = parsed
      .map((variant) => ({
        id: String(variant.id || crypto.randomUUID()),
        label: String(variant.label ?? "").trim(),
        labelAr: String(variant.labelAr || variant.label || "").trim(),
        price: Number(variant.price),
        duration: String(variant.duration || variant.label || "").trim(),
        durationAr: String(variant.durationAr || variant.labelAr || variant.duration || "").trim(),
        oldPrice: variant.oldPrice ? Number(variant.oldPrice) : undefined,
        available: variant.available !== false,
      }))
      .map((variant) => productPriceOptionSchema.parse(variant))
      .filter((variant) => variant.label && variant.duration && Number.isFinite(variant.price) && variant.price > 0);

    return variants.length ? variants : undefined;
  } catch {
    return undefined;
  }
}

function parseOptionalJson<T>(value: string): T | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as T : undefined;
  } catch {
    return undefined;
  }
}

export async function saveProductAction(formData: FormData) {
  await requireAdmin();

  const selectedCategory = text(formData, "category");
  const customCategory = text(formData, "customCategory");
  const category = selectedCategory === "__custom" ? customCategory : selectedCategory;
  if (!category) {
    throw new Error("Please choose or enter a product category.");
  }
  const categoryConfig = getSiteCategories().find((entry) => entry.id === category);
  const categoryAr = selectedCategory === "__custom"
    ? text(formData, "customCategoryAr") || category
    : categoryConfig?.name.ar || category;
  const id = text(formData, "id") || text(formData, "slug") || crypto.randomUUID();
  const slug = text(formData, "slug");
  const price = numberValue(formData, "price") ?? 0;
  const oldPrice = numberValue(formData, "oldPrice");
  const uploadedImagePath = await saveUploadedProductImage(formData, slug);
  const image = uploadedImagePath ?? text(formData, "image");

  if (!image) {
    throw new Error("Please upload a product image or enter an image path.");
  }

  const product: Product = {
    id,
    slug,
    name: text(formData, "name"),
    nameAr: text(formData, "nameAr") || text(formData, "name"),
    category: category as Product["category"],
    categoryAr,
    price,
    oldPrice,
    currency: "DZD",
    duration: text(formData, "duration"),
    durationAr: text(formData, "durationAr") || text(formData, "duration"),
    shortDescriptionAr: text(formData, "shortDescriptionAr"),
    shortDescriptionEn: text(formData, "shortDescriptionEn"),
    featuresAr: lines(text(formData, "featuresAr")),
    featuresEn: lines(text(formData, "featuresEn")),
    activationTypeAr: text(formData, "activationTypeAr"),
    activationTypeEn: text(formData, "activationTypeEn"),
    image,
    available: formData.get("available") === "on",
    featured: formData.get("featured") === "on",
    priceOptions: parseVariants(text(formData, "priceOptions")),
    details: parseOptionalJson<ProductDetails>(text(formData, "details")),
    faqs: parseOptionalJson<Product["faqs"]>(text(formData, "faqs")),
  };

  await saveProduct(product);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
  revalidatePath(`/products/${product.slug}`);
  redirect("/admin/products");
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) throw new Error("Missing product id.");
  await deleteProduct(id);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/products");
}


