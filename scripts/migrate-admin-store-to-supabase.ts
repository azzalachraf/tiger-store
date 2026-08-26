/**
 * One-off, idempotent importer for data/admin-store.json.
 * Apply supabase/schema.sql manually first. This script never deletes data.
 *
 *   npm run migrate:admin-store -- --dry-run
 *   npm run migrate:admin-store
 */
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");

type JsonOption = Record<string, unknown> & { id?: string; label?: string; price?: unknown };
type JsonProduct = Record<string, unknown> & { id?: string; price?: unknown; oldPrice?: unknown; priceOptions?: JsonOption[] };
type JsonAccount = Record<string, unknown>;
type Store = {
  products?: JsonProduct[];
  orders?: Record<string, unknown>[];
  accounts?: JsonAccount[];
  settings?: Record<string, unknown>;
};

const store = JSON.parse(readFileSync(join(process.cwd(), "data", "admin-store.json"), "utf8")) as Store;

function integer(value: unknown) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error("Found a non-integer DZD value in admin-store.json.");
  return number;
}

function stableOptionId(productId: string, option: JsonOption, index: number) {
  const existing = String(option.id ?? "").trim().toLowerCase();
  if (existing) return existing.startsWith(`${productId}:`) ? existing : `${productId}:${existing}`;
  const label = String(option.label ?? `option-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${productId}:${label || `option-${index + 1}`}`;
}

function normalizeProduct(product: JsonProduct) {
  const id = String(product.id ?? "").trim();
  if (!id) throw new Error("Every imported product needs an id.");
  const priceOptions = (product.priceOptions ?? []).map((option, index) => ({
    ...option,
    id: stableOptionId(id, option, index),
    price: integer(option.price),
    oldPrice: option.oldPrice === undefined || option.oldPrice === null || option.oldPrice === "" ? undefined : integer(option.oldPrice),
  }));
  return {
    ...product,
    id,
    price: integer(product.price),
    oldPrice: product.oldPrice === undefined || product.oldPrice === null || product.oldPrice === "" ? undefined : integer(product.oldPrice),
    priceOptions,
  };
}

function encryptionKey() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error("ENCRYPTION_KEY must be set to import account credentials.");
  return createHash("sha256").update(secret).digest();
}

function encrypt(value: unknown) {
  const text = String(value ?? "");
  if (!text || text.startsWith("v1:")) return text;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}

function normalizeAccount(account: JsonAccount) {
  const price = integer(account.price);
  return {
    id: String(account.id ?? "").trim(),
    email: String(account.email ?? "").trim(),
    // Dry runs inspect counts only; they must not require any secrets.
    emailPasswordEncrypted: dryRun ? "[redacted]" : encrypt(account.emailPasswordEncrypted ?? account.emailPassword),
    chatgptPasswordEncrypted: dryRun ? "[redacted]" : encrypt(account.chatgptPasswordEncrypted ?? account.chatgptPassword),
    dateCreated: String(account.dateCreated ?? "").trim(),
    price,
    notes: String(account.notes ?? ""),
    status: String(account.status ?? "Available"),
    updatedAt: String(account.updatedAt ?? new Date().toISOString()),
  };
}

async function main() {
  const products = (store.products ?? []).map(normalizeProduct);
  const options = products.flatMap((product) =>
    (product.priceOptions as Array<Record<string, unknown>>).map(({ id, ...option }) => ({ product_id: product.id, id, ...option })),
  );
  const accounts = (store.accounts ?? []).map(normalizeAccount);

  const summary = `products=${products.length}, options=${options.length}, orders=${store.orders?.length ?? 0}, accounts=${accounts.length}, settings=${store.settings ? 1 : 0}`;
  if (dryRun) {
    console.log(`Dry run complete (${summary}). No remote data was changed.`);
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  async function upsert(table: string, rows: Record<string, unknown> | Record<string, unknown>[], onConflict: string) {
    if (Array.isArray(rows) && rows.length === 0) return;
    const { error } = await client.from(table).upsert(rows, { onConflict });
    if (error) throw new Error(`${table} import failed: ${error.message}`);
  }

  await upsert("products", products, "id");
  await upsert("product_options", options, "product_id,id");
  await upsert("orders", store.orders ?? [], "id");
  await upsert("accounts", accounts, "id");
  if (store.settings) await upsert("settings", { id: "main", ...store.settings }, "id");
  console.log(`Migration complete (${summary}). JSON source retained for verification.`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown migration error.";
  console.error(`Migration failed: ${message}`);
  process.exitCode = 1;
});
