import "server-only";

import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { supabase } from "@/lib/supabase";
import { AdminAccount, AdminAccountStatus, AdminOrder, Product, SiteSettings } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Encryption helpers (unchanged – passwords encrypted before DB)    */
/* ------------------------------------------------------------------ */

const accountStatuses: AdminAccountStatus[] = ["Available", "Sold", "Expired", "Problem"];

function encryptionKey() {
  const secret = process.env.ADMIN_PASSWORD || process.env.ADMIN_EMAIL || "tiger-store-local-admin";
  return createHash("sha256").update(secret).digest();
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
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("featured", { ascending: false });

  if (error) {
    console.error("getProducts error:", error.message);
    return [];
  }
  return (data ?? []) as Product[];
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return (data as Product) ?? undefined;
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return (data as Product) ?? undefined;
}

export async function saveProduct(product: Product) {
  const { error } = await supabase.from("products").upsert(product, { onConflict: "id" });
  if (error) throw new Error(`saveProduct failed: ${error.message}`);
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(`deleteProduct failed: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/*  Orders                                                            */
/* ------------------------------------------------------------------ */

export async function getOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("getOrders error:", error.message);
    return [];
  }
  return (data ?? []) as AdminOrder[];
}

export async function saveOrder(order: AdminOrder) {
  const { error } = await supabase.from("orders").upsert(order, { onConflict: "id" });
  if (error) throw new Error(`saveOrder failed: ${error.message}`);
}

export async function deleteOrder(id: string) {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw new Error(`deleteOrder failed: ${error.message}`);
}

/* ------------------------------------------------------------------ */
/*  Settings                                                          */
/* ------------------------------------------------------------------ */

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    console.error("getSettings error:", error.message);
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
  return { ...defaultSettings, ...rest } as SiteSettings;
}

export async function saveSettings(settings: SiteSettings) {
  const { error } = await supabase
    .from("settings")
    .upsert({ id: "main", ...settings }, { onConflict: "id" });

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
  const { data, error } = await supabase
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
  const { error } = await supabase
    .from("accounts")
    .upsert(accountToDbRow(account), { onConflict: "id" });

  if (error) throw new Error(`saveAccount failed: ${error.message}`);
}

export async function saveAccounts(accounts: AdminAccount[]) {
  const rows = accounts.map(accountToDbRow);
  const { error } = await supabase
    .from("accounts")
    .upsert(rows, { onConflict: "id" });

  if (error) throw new Error(`saveAccounts failed: ${error.message}`);
}

export async function deleteAccount(id: string) {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw new Error(`deleteAccount failed: ${error.message}`);
}
