import { z } from "zod";

export const paymentMethodSchema = z.enum(["BaridiMob", "CCP", "RedotPay"]);
export const orderStatusSchema = z.enum(["pending", "paid", "delivered", "cancelled", "refunded"]);
export const accountStatusSchema = z.enum(["Available", "Sold", "Expired", "Problem"]);

const optionalTextSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
}, z.string().optional());

export const productPriceOptionSchema = z.object({
  label: z.string().trim().min(1).max(120),
  labelAr: z.string().trim().min(1).max(120),
  price: z.coerce.number().positive(),
  oldPrice: z.coerce.number().positive().optional(),
  duration: z.string().trim().min(1).max(120),
  durationAr: z.string().trim().min(1).max(120),
  available: z.boolean().optional().default(true),
});

export const productSchema = z.object({
  id: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(180),
  nameAr: z.string().trim().min(1).max(180),
  category: z.string().trim().min(1).max(80),
  categoryAr: z.string().trim().min(1).max(120),
  price: z.coerce.number().nonnegative(),
  oldPrice: z.coerce.number().positive().optional(),
  currency: z.literal("DZD"),
  duration: z.string().trim().min(1).max(120),
  durationAr: z.string().trim().min(1).max(120),
  shortDescriptionAr: z.string().trim().max(1200),
  shortDescriptionEn: z.string().trim().max(1200),
  featuresAr: z.array(z.string().trim().min(1).max(240)).default([]),
  featuresEn: z.array(z.string().trim().min(1).max(240)).default([]),
  activationTypeAr: z.string().trim().max(160),
  activationTypeEn: z.string().trim().max(160),
  image: z.string().trim().min(1).max(2000),
  available: z.boolean(),
  featured: z.boolean(),
  priceOptions: z.array(productPriceOptionSchema).optional(),
});

export const cartItemSchema = z.object({
  id: z.string().trim().min(1).max(240),
  productId: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(160),
  name: z.string().trim().min(1).max(180),
  nameAr: z.string().trim().min(1).max(180),
  image: z.string().trim().min(1).max(2000),
  option: z.string().trim().min(1).max(160),
  optionAr: z.string().trim().min(1).max(160),
  duration: z.string().trim().min(1).max(160),
  durationAr: z.string().trim().min(1).max(160),
  price: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().int().positive().max(20),
});

export const adminOrderSchema = z.object({
  id: z.string().trim().min(1).max(160),
  customerName: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(1).max(60),
  email: z.string().trim().max(180),
  products: z.array(cartItemSchema).default([]),
  paymentMethod: paymentMethodSchema,
  total: z.coerce.number().nonnegative(),
  notes: optionalTextSchema,
  status: orderStatusSchema,
  createdAt: z.string().trim().min(1).max(80),
  adminNotes: optionalTextSchema,
  utm_source: optionalTextSchema,
  utm_medium: optionalTextSchema,
  utm_campaign: optionalTextSchema,
  referrer: optionalTextSchema,
});

export const checkoutOrderInputSchema = z.object({
  customerName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(6).max(60),
  email: z.string().trim().max(180),
  products: z.array(cartItemSchema).min(1).max(20),
  paymentMethod: paymentMethodSchema,
  total: z.coerce.number().nonnegative(),
  notes: optionalTextSchema,
  utm_source: optionalTextSchema,
  utm_medium: optionalTextSchema,
  utm_campaign: optionalTextSchema,
  referrer: optionalTextSchema,
  eventId: optionalTextSchema,
});

export const siteSettingsSchema = z.object({
  whatsappNumber: z.string().trim().min(6).max(60),
  instagramUrl: z.string().trim().url().or(z.literal("")),
  facebookUrl: z.string().trim().url().or(z.literal("")),
  domainText: z.string().trim().min(1).max(120),
  baridiMobRip: z.string().trim().max(120),
  ccpDetails: z.string().trim().max(1200),
  redotPayDetails: z.string().trim().max(1200),
  promoHeadings: z.array(z.string().trim().min(1).max(240)).max(12),
  footerDisclaimer: z.string().trim().max(1200),
});

export const pageEventInputSchema = z.object({
  event_type: z.enum(["page_view", "product_view", "add_to_cart", "checkout_started", "purchase_completed"]),
  page_url: optionalTextSchema,
  product_id: optionalTextSchema,
  session_id: optionalTextSchema,
  utm_source: optionalTextSchema,
  utm_medium: optionalTextSchema,
  utm_campaign: optionalTextSchema,
  utm_content: optionalTextSchema,
  utm_term: optionalTextSchema,
  referrer: optionalTextSchema,
});

export function formatValidationError(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`).join("; ");
}
