"use server";

import { revalidatePath } from "next/cache";
import { getProductBySlug, saveOrder } from "@/lib/admin-store";
import { normalizeAlgerianPhone } from "@/lib/stock-alerts";
import { receiptOrderInputSchema } from "@/lib/validation";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { AdminOrder, CartItem, Product, ProductPriceOption } from "@/lib/types";
import { notifyTelegramOfOrder } from "@/lib/telegram-notifications";
import { notifyOwnerOfReceipt } from "@/lib/whatsapp-notifications";
import { logger } from "@/lib/logger";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const receiptTypes = new Map<string, string>([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

function hasReceiptMagic(bytes: Uint8Array, type: string) {
  if (type === "image/png") return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return type === "image/webp" && bytes.length >= 12 && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

function offerFor(product: Product, optionId: string): ProductPriceOption | undefined {
  if (product.priceOptions?.length) return product.priceOptions.find((option) => option.id === optionId);
  const defaultOffer: ProductPriceOption = { id: `${product.id}:default`, label: product.duration, labelAr: product.durationAr, duration: product.duration, durationAr: product.durationAr, price: product.price, oldPrice: product.oldPrice, available: product.available };
  return optionId === defaultOffer.id ? defaultOffer : undefined;
}

async function resolveItems(lines: { slug: string; optionId: string; quantity: number }[]) {
  const items: CartItem[] = [];
  for (const line of lines) {
    const product = await getProductBySlug(line.slug);
    const offer = product ? offerFor(product, line.optionId) : undefined;
    if (!product || !product.available || !offer || offer.available === false || offer.price <= 0) throw new Error("One or more selected products are no longer available.");
    items.push({ id: `${product.id}:${offer.id}`, productId: product.id, slug: product.slug, name: product.name, nameAr: product.nameAr, image: product.image, option: offer.label, optionId: offer.id, optionAr: offer.labelAr, duration: offer.duration, durationAr: offer.durationAr, price: offer.price, quantity: line.quantity });
  }
  return items;
}

async function createReceiptOrder(formData: FormData) {
  const receipt = formData.get("receipt");
  if (!(receipt instanceof File) || receipt.size === 0 || receipt.size > MAX_RECEIPT_BYTES || !receiptTypes.has(receipt.type)) throw new Error("Upload a PNG, JPG, or WebP receipt no larger than 5 MB.");
  const parsed = receiptOrderInputSchema.parse({
    customerName: formData.get("customerName"), phone: formData.get("phone"), notes: formData.get("notes"), paymentMethod: formData.get("paymentMethod"),
    lines: JSON.parse(String(formData.get("lines") ?? "[]")),
  });
  const phone = normalizeAlgerianPhone(parsed.phone);
  if (!phone) throw new Error("Enter a valid Algerian mobile number.");
  const bytes = new Uint8Array(await receipt.arrayBuffer());
  if (!hasReceiptMagic(bytes, receipt.type)) throw new Error("The receipt file does not match its image type.");

  const products = await resolveItems(parsed.lines);
  if (parsed.paymentMethod === "Flexy" && (products.length !== 1 || products[0].slug !== "snapchat-plus")) {
    throw new Error("Flexy is available only for Snapchat Plus.");
  }
  const total = products.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const id = `TS-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const extension = receiptTypes.get(receipt.type)!;
  const receiptPath = `orders/${id}/${crypto.randomUUID()}.${extension}`;
  const storage = getSupabaseServiceClient().storage.from("receipts");
  const uploaded = await storage.upload(receiptPath, bytes, { contentType: receipt.type, upsert: false });
  if (uploaded.error) throw new Error("Unable to store the receipt. Please try again.");

  const order: AdminOrder = { id, customerName: parsed.customerName, phone, email: "", products, paymentMethod: parsed.paymentMethod, total, notes: parsed.notes, status: "pending", createdAt: new Date().toISOString(), receiptPath, receiptUploadedAt: new Date().toISOString() };
  try {
    await saveOrder(order);
  } catch {
    await storage.remove([receiptPath]);
    throw new Error("Unable to save the order. Please try again.");
  }
  await notifyOwnerOfReceipt(order);
  await notifyTelegramOfOrder(order);
  revalidatePath("/admin", "layout");
  return { id: order.id, total: order.total };
}

export async function submitReceiptOrderAction(formData: FormData) {
  try {
    return { ok: true as const, order: await createReceiptOrder(formData) };
  } catch (error) {
    logger.error("checkout receipt order failed", error);
    const code = error instanceof Error && error.message === "Enter a valid Algerian mobile number." ? "invalid_phone" : "save_failed";
    return { ok: false as const, code };
  }
}
