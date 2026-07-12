import "server-only";

import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { getEncryptionSecret } from "@/lib/env";
import { logger } from "@/lib/logger";
import { AdminAccount, AdminAccountStatus, AdminOrder, Product, SiteSettings } from "@/lib/types";
import { adminOrderSchema, productSchema, siteSettingsSchema } from "@/lib/validation";

const supabaseService = getSupabaseServiceClient();

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
  const { data, error } = await supabaseService
    .from("products")
    .select("*")
    .order("featured", { ascending: false });

  if (error) {
    logger.error("getProducts failed", error);
    return [];
  }
  return productSchema.array().catch([]).parse(data ?? []);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const { data, error } = await supabaseService
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error("getProductById failed", error, { id });
    return undefined;
  }

  if (!data) return undefined;
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("getProductById validation failed", parsed.error, { id });
    return undefined;
  }
  return parsed.data;
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const { data, error } = await supabaseService
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    logger.error("getProductBySlug failed", error, { slug });
    return undefined;
  }

  if (!data) return undefined;
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("getProductBySlug validation failed", parsed.error, { slug });
    return undefined;
  }
  return parsed.data;
}

export async function saveProduct(product: Product) {
  const validatedProduct = productSchema.parse(product);
  const { error } = await supabaseService.from("products").upsert(validatedProduct, { onConflict: "id" });
  if (error) throw new Error(`saveProduct failed: ${error.message}`);
}

export async function deleteProduct(id: string) {
  const { error } = await supabaseService.from("products").delete().eq("id", id);
  if (error) throw new Error(`deleteProduct failed: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/*  Orders                                                            */
/* ------------------------------------------------------------------ */

export async function getOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabaseService
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
  const { data, error } = await supabaseService
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
  const { error } = await supabaseService.from("orders").upsert(validatedOrder, { onConflict: "id" });
  if (error) throw new Error(`saveOrder failed: ${error.message}`);
}

export async function deleteOrder(id: string) {
  const { error } = await supabaseService.from("orders").delete().eq("id", id);
  if (error) throw new Error(`deleteOrder failed: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/*  Settings                                                          */
/* ------------------------------------------------------------------ */

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await supabaseService
    .from("settings")
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    logger.error("getSettings failed", error);
    return defaultSettings;
  }

  if (!data) {
    // First run – try to insert defaults (ignore errors if table missing)
    try {
      await saveSettings(defaultSettings);
    } catch {
      // Table may not exist yet during build
    }
    return defaultSettings;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...rest } = data;
  return siteSettingsSchema.catch(defaultSettings).parse({ ...defaultSettings, ...rest });
}

export async function saveSettings(settings: SiteSettings) {
  const validatedSettings = siteSettingsSchema.parse(settings);
  const { error } = await supabaseService
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
  const { data, error } = await supabaseService
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
  const { error } = await supabaseService
    .from("accounts")
    .upsert(accountToDbRow(account), { onConflict: "id" });

  if (error) throw new Error(`saveAccount failed: ${error.message}`);
}

export async function saveAccounts(accounts: AdminAccount[]) {
  const rows = accounts.map(accountToDbRow);
  const { error } = await supabaseService
    .from("accounts")
    .upsert(rows, { onConflict: "id" });

  if (error) throw new Error(`saveAccounts failed: ${error.message}`);
}

export async function deleteAccount(id: string) {
  const { error } = await supabaseService.from("accounts").delete().eq("id", id);
  if (error) throw new Error(`deleteAccount failed: ${error.message}`);
}


