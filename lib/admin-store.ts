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
    ? { ...catalogProduct, ...product, duration: product.duration || catalogProduct.duration, durationAr: product.durationAr || catalogProduct.durationAr, priceOptions: stableOptions, details: catalogProduct.details ? { ...catalogProduct.details, ...product.details, warrantyAr: catalogProduct.details.warrantyAr, warrantyEn: catalogProduct.details.warrantyEn } : product.details, faqs: product.faqs ?? catalogProduct.faqs }
    : { ...product, priceOptions: stableOptions };
}

function isMissingProductOptionsTable(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205" || error?.message?.includes("public.product_options") === true;
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
  instagramUrl: "https://www.instagram.com/tiger.store.dz2/",
  facebookUrl: "https://www.facebook.com/people/Tiger-Store/61589903873726/",
  domainText: "tiger-storedz.com",
  baridiMobRip: "00799999004414930471",
  ccpDetails: "Binance ID: 1238309429",
  redotPayDetails: "RedotPay ID: 1108714040",
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
    // The deployed catalog already persists variants in products.priceOptions.
    // Keep product editing functional on projects where the optional normalized
    // product_options table has not yet been applied.
    if (optionError && !isMissingProductOptionsTable(optionError)) {
      throw new Error(`saveProduct options failed: ${optionError.message}`);
    }
    if (optionError) {
      logger.warn("product_options table is unavailable; saved variants in products.priceOptions only", { productId: validatedProduct.id });
    }
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

export type DeleteOrderResult = { deleted: boolean; receiptCleanupFailed: boolean };

function isMissingPermanentDeleteFunction(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST202" || error?.message?.includes("delete_order_permanently") === true;
}

async function requireDelete(result: { error: { message: string } | null }, recordType: string) {
  if (result.error) throw new Error(`deleteOrder ${recordType} cleanup failed: ${result.error.message}`);
}

// Older deployed projects may not have the atomic RPC migration yet. This
// ordered fallback keeps the same permanent-delete behavior while preserving
// the redeem card as consumed: a code that was already revealed must never be
// returned to inventory. The migration below is used automatically once it is
// applied, which makes the database portion transactional.
async function deleteOrderWithoutPermanentDeleteFunction(id: string) {
  const client = supabase();
  const [saleResult, certificateResult] = await Promise.all([
    client.from("finance_sales").select("operation_id").eq("order_id", id).maybeSingle(),
    client.from("warranty_certificates").select("id, operation_id").eq("order_id", id),
  ]);
  if (saleResult.error) throw new Error(`deleteOrder finance lookup failed: ${saleResult.error.message}`);
  if (certificateResult.error) throw new Error(`deleteOrder warranty lookup failed: ${certificateResult.error.message}`);

  const operationId = saleResult.data?.operation_id ?? certificateResult.data?.find((certificate) => certificate.operation_id)?.operation_id;
  const certificateIds = certificateResult.data?.map((certificate) => String(certificate.id)) ?? [];

  await requireDelete(await client.from("operation_events").delete().eq("entity_type", "order").eq("entity_id", id), "order event");
  if (certificateIds.length) {
    await requireDelete(await client.from("operation_events").delete().eq("entity_type", "warranty").in("entity_id", certificateIds), "warranty event");
  }
  if (operationId) {
    await requireDelete(await client.from("operation_events").delete().contains("metadata", { operation_id: operationId }), "operation event");
  }
  await requireDelete(await client.from("financial_adjustments").delete().eq("order_id", id), "adjustment");
  await requireDelete(await client.from("payment_records").delete().eq("order_id", id), "payment record");
  await requireDelete(await client.from("commissions").delete().eq("order_id", id), "commission");
  await requireDelete(await client.from("inventory_assignments").delete().eq("order_id", id), "inventory assignment");
  await requireDelete(await client.from("warranty_certificates").delete().eq("order_id", id), "warranty certificate");
  await requireDelete(await client.from("finance_sales").delete().eq("order_id", id), "finance sale");
  if (operationId) {
    await requireDelete(await client.from("snapchat_operations").delete().eq("id", operationId), "Snapchat operation");
  }
  await requireDelete(await client.from("orders").delete().eq("id", id), "order");
}

export async function deleteOrder(id: string): Promise<DeleteOrderResult> {
  const order = await getOrderById(id);
  if (!order) return { deleted: false, receiptCleanupFailed: false };

  const { data: deleted, error } = await supabase().rpc("delete_order_permanently", { p_order_id: id });
  if (error && !isMissingPermanentDeleteFunction(error)) throw new Error(`deleteOrder failed: ${error.message}`);
  if (!error && !deleted) return { deleted: false, receiptCleanupFailed: false };
  if (error) await deleteOrderWithoutPermanentDeleteFunction(id);

  if (!order.receiptPath) return { deleted: true, receiptCleanupFailed: false };
  const { error: receiptError } = await supabase().storage.from("receipts").remove([order.receiptPath]);
  if (receiptError) {
    logger.error("deleteOrder receipt cleanup failed", receiptError, { id });
    return { deleted: true, receiptCleanupFailed: true };
  }
  return { deleted: true, receiptCleanupFailed: false };
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


