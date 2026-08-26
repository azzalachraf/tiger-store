/** One-off, idempotent migration. Run only after manually applying supabase/schema.sql. */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
type MigrationClient = {
  from: (table: string) => {
    upsert: (
      rows: Record<string, unknown> | Record<string, unknown>[],
      options: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
};
let client: MigrationClient | undefined;

type JsonProduct = Record<string, unknown> & { id?: string; priceOptions?: Array<Record<string, unknown>> };
type Store = { products?: JsonProduct[]; orders?: Record<string, unknown>[]; accounts?: Record<string, unknown>[]; settings?: Record<string, unknown> };
const store = JSON.parse(readFileSync(join(process.cwd(), "data", "admin-store.json"), "utf8")) as Store;

function optionId(productId: string, option: Record<string, unknown>, index: number) {
  const existing = String(option.id ?? "").trim();
  if (existing) return existing;
  const label = String(option.label ?? `option-${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${productId}:${label || index + 1}`;
}

function integer(value: unknown) { return Math.round(Number(value) || 0); }
const products = (store.products ?? []).map((product) => ({
  ...product,
  price: integer(product.price),
  oldPrice: product.oldPrice === undefined ? undefined : integer(product.oldPrice),
  priceOptions: (product.priceOptions ?? []).map((option, index) => ({ ...option, id: optionId(String(product.id), option, index), price: integer(option.price), oldPrice: option.oldPrice === undefined ? undefined : integer(option.oldPrice) })),
}));
const productOptions = products.flatMap((product) =>
  (Array.isArray(product.priceOptions) ? product.priceOptions : []).map((option) => ({
    product_id: String(product.id),
    ...option,
  })),
);

function getClient(): MigrationClient {
  if (!url || !key) throw new Error("Missing required Supabase environment variables.");
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as MigrationClient;
  return client;
}

async function upsert(
  table: "products" | "product_options" | "orders" | "accounts" | "settings",
  rows: Record<string, unknown> | Record<string, unknown>[],
  conflict: string,
) {
  const count = Array.isArray(rows) ? rows.length : 1;
  console.log(`${dryRun ? "Would upsert" : "Upserting"} ${count} ${table}.`);
  if (dryRun || count === 0) return;
  const { error } = await getClient().from(table).upsert(rows, { onConflict: conflict });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function main() {
  await upsert("products", products, "id");
  await upsert("product_options", productOptions, "product_id,id");
  await upsert("orders", store.orders ?? [], "id");
  await upsert("accounts", store.accounts ?? [], "id");
  if (store.settings) await upsert("settings", { id: "main", ...store.settings }, "id");
  console.log(dryRun ? "Dry run complete. No remote data was changed." : "Migration complete. JSON source retained for verification.");
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exitCode = 1;
});
