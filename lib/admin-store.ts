import "server-only";

import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { getEncryptionSecret } from "@/lib/env";
import { logger } from "@/lib/logger";
import { AdminAccount, AdminAccountStatus, AdminOrder, Product, SiteSettings } from "@/lib/types";
import { adminAccountSchema, adminOrderSchema, productSchema, siteSettingsSchema } from "@/lib/validation";
import { getCatalogProductById, getCatalogProductBySlug, products as catalogProducts } from "@/data/products";

function supabase() {
  return getSupabaseServiceClient();
}

function enrichCatalogProduct(product: Product): Product {
  const catalogProduct = getCatalogProductById(product.id) ?? getCatalogProductBySlug(product.slug);
  const stableOptions = product.priceOptions?.map((option, index) => ({
    ...option,
    id: option.id || catalogProduct?.priceOptions?.[index]?.id || `${product.id}:option-${index + 1}`,
  }));
  return catalogProduct
    ? { ...catalogProduct, ...product, duration: product.duration || catalogProduct.duration, durationAr: product.durationAr || catalogProduct.durationAr, priceOptions: stableOptions, details: product.details ?? catalogProduct.details, faqs: product.faqs ?? catalogProduct.faqs }
    : { ...product, priceOptions: stableOptions };
}

/* ------------------------------------------------------------------ */
/*  Encryption helpers (unchanged – passwords encrypted before DB)    */
/* ------------------------------------------------------------------ */

const accountStatuses: AdminAccountStatus[] = ["Available", "Sold", "Expired", "Problem"];

function encryptionKey() {
  return createHash("sha256").update(getEncryptionSecret()).digest();
}

function encryptSecret(value: string) {
  if (!value) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptSecret(value?: string) {
  if (!value) return "";
  if (!value.startsWith("v1:")) return value;
  try {
    const [, iv, tag, encrypted] = value.split(":");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}

function normalizeStatus(value: unknown): AdminAccountStatus {
  return accountStatuses.includes(value as AdminAccountStatus) ? (value as AdminAccountStatus) : "Available";
}

/* ------------------------------------------------------------------ */
/*  Default settings (used as fallback when table is empty)           */
/* ------------------------------------------------------------------ */

const defaultSettings: SiteSettings = {
  whatsappNumber: "+213 556 97 45 93",
  instagramUrl: "https://www.instagram.com/tigerr_store_dz/",
  facebookUrl: "https://www.facebook.com/people/Tiger-Store/61589903873726/",
  domainText: "digitaldz.shop",
  baridiMobRip: "00799999004414930471",
  ccpDetails: "Payment details will be confirmed after order submission.",
  redotPayDetails: "Payment details will be confirmed after order submission.",
  promoHeadings: [
    "كل ما تحتاجه من اشتراكات رقمية في مكان واحد",
    "أفضل الأسعار في السوق بطرق دفع مختلفة",
    "خدمة سريعة واستجابة فورية ودعم بعد البيع",
    "تابعنا على حساباتنا الرسمية في منصات التواصل الاجتماعي",
  ],
  footerDisclaimer:
    "Tiger Store is an independent digital subscription provider and is not officially affiliated with the brands listed.",
};

/* ------------------------------------------------------------------ */
/*  Products                                                          */
/* ------------------------------------------------------------------ */

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase()
    .from("products")
    .select("*")
    .order("featured", { ascending: false });

  if (error) {
    logger.error("getProducts failed", error);
    return catalogProducts;
  }
  const stored = productSchema.array().catch([]).parse(data ?? []);
  return stored.length ? stored.map(enrichCatalogProduct) : catalogProducts;
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const { data, error } = await supabase()
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error("getProductById failed", error, { id });
    return getCatalogProductById(id);
  }

  if (!data) return getCatalogProductById(id);
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("getProductById validation failed", parsed.error, { id });
    return getCatalogProductById(id);
  }
  return enrichCatalogProduct(parsed.data);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const { data, error } = await supabase()
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    logger.error("getProductBySlug failed", error, { slug });
    return getCatalogProductBySlug(slug);
  }

  if (!data) return getCatalogProductBySlug(slug);
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("getProductBySlug validation failed", parsed.error, { slug });
    return getCatalogProductBySlug(slug);
  }
  return enrichCatalogProduct(parsed.data);
}

export async function saveProduct(product: Product) {
  const validatedProduct = productSchema.parse(product);
  const client = supabase();
  const { error } = await client.from("products").upsert(validatedProduct, { onConflict: "id" });
  if (error) throw new Error(`saveProduct failed: ${error.message}`);

  const options = validatedProduct.priceOptions ?? [];
  if (options.length) {
    const { error: optionError } = await client.from("product_options").upsert(
      options.map((option) => ({ product_id: validatedProduct.id, ...option })),
      { onConflict: "product_id,id" },
    );
    if (optionError) throw new Error(`saveProduct options failed: ${optionError.message}`);
  }
}

export async function deleteProduct(id: string) {
  const { error } = await supabase().from("products").delete().eq("id", id);
  if (error) throw new Error(`deleteProduct failed: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/*  Orders                                                            */
/* ------------------------------------------------------------------ */

export async function getOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabase()
    .from("orders")
    .select("*")
    .order("createdAt", { ascending: false });

  if (error) {
    logger.error("getOrders failed", error);
    return [];
  }
  return adminOrderSchema.array().catch([]).parse(data ?? []);
}

export async function getOrderById(id: string): Promise<AdminOrder | undefined> {
  const { data, error } = await supabase()
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error("getOrderById failed", error, { id });
    return undefined;
  }

  if (!data) return undefined;
  const parsed = adminOrderSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("getOrderById validation failed", parsed.error, { id });
    return undefined;
  }
  return parsed.data;
}

export async function saveOrder(order: AdminOrder) {
  const validatedOrder = adminOrderSchema.parse(order);
  const { error } = await supabase().from("orders").upsert(validatedOrder, { onConflict: "id" });
  if (error) throw new Error(`saveOrder failed: ${error.message}`);
}

export async function getReceiptSignedUrl(receiptPath?: string) {
  if (!receiptPath) return undefined;
  const { data, error } = await supabase().storage.from("receipts").createSignedUrl(receiptPath, 60 * 10);
  if (error) {
    logger.error("getReceiptSignedUrl failed", error);
    return undefined;
  }
  return data.signedUrl;
}

export async function deleteOrder(id: string) {
  const { error } = await supabase().from("orders").delete().eq("id", id);
  if (error) throw new Error(`deleteOrder failed: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/*  Settings                                                          */
/* ------------------------------------------------------------------ */

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase()
    .from("settings")
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    logger.error("getSettings failed", error);
    return defaultSettings;
  }

  if (!data) {
    // Reads must remain read-only until the owner runs the one-off migration.
    return defaultSettings;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...rest } = data;
  return siteSettingsSchema.catch(defaultSettings).parse({ ...defaultSettings, ...rest });
}

export async function saveSettings(settings: SiteSettings) {
  const validatedSettings = siteSettingsSchema.parse(settings);
  const { error } = await supabase()
    .from("settings")
    .upsert({ id: "main", ...validatedSettings }, { onConflict: "id" });

  if (error) throw new Error(`saveSettings failed: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/*  Accounts                                                          */
/* ------------------------------------------------------------------ */

type StoredAccount = {
  id: string;
  email: string;
  emailPasswordEncrypted: string;
  chatgptPasswordEncrypted: string;
  dateCreated: string;
  price: number;
  notes?: string;
  status: string;
  updatedAt: string;
};

function dbRowToAccount(row: StoredAccount): AdminAccount {
  return {
    id: String(row.id || crypto.randomUUID()),
    email: String(row.email ?? "").trim(),
    emailPassword: decryptSecret(row.emailPasswordEncrypted),
    chatgptPassword: decryptSecret(row.chatgptPasswordEncrypted),
    dateCreated: String(row.dateCreated || new Date().toISOString().slice(0, 10)),
    price: Number.isFinite(Number(row.price)) ? Number(row.price) : 0,
    notes: String(row.notes ?? ""),
    status: normalizeStatus(row.status),
    updatedAt: String(row.updatedAt || new Date().toISOString()),
  };
}

function accountToDbRow(account: AdminAccount): StoredAccount {
  return {
    id: account.id,
    email: account.email,
    emailPasswordEncrypted: encryptSecret(account.emailPassword),
    chatgptPasswordEncrypted: encryptSecret(account.chatgptPassword),
    dateCreated: account.dateCreated,
    price: account.price,
    notes: account.notes ?? "",
    status: account.status,
    updatedAt: account.updatedAt,
  };
}

export async function getAccounts(): Promise<AdminAccount[]> {
  const { data, error } = await supabase()
    .from("accounts")
    .select("*")
    .order("updatedAt", { ascending: false });

  if (error) {
    console.error("getAccounts error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => dbRowToAccount(row as StoredAccount));
}

export async function saveAccount(account: AdminAccount) {
  const validatedAccount = adminAccountSchema.parse(account);
  const { error } = await supabase()
    .from("accounts")
    .upsert(accountToDbRow(validatedAccount), { onConflict: "id" });

  if (error) throw new Error(`saveAccount failed: ${error.message}`);
}

export async function saveAccounts(accounts: AdminAccount[]) {
  const rows = accounts.map((account) => accountToDbRow(adminAccountSchema.parse(account)));
  const { error } = await supabase()
    .from("accounts")
    .upsert(rows, { onConflict: "id" });

  if (error) throw new Error(`saveAccounts failed: ${error.message}`);
}

export async function deleteAccount(id: string) {
  const { error } = await supabase().from("accounts").delete().eq("id", id);
  if (error) throw new Error(`deleteAccount failed: ${error.message}`);
}


