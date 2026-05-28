/**
 * Seed script – imports existing admin-store.json data into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-supabase.ts
 *
 * This reads data/admin-store.json and upserts everything into the
 * products, orders, accounts, and settings Supabase tables.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("📦 Reading data/admin-store.json ...");

  const storePath = join(process.cwd(), "data", "admin-store.json");
  const raw = readFileSync(storePath, "utf8");
  const store = JSON.parse(raw) as {
    products?: Record<string, unknown>[];
    orders?: Record<string, unknown>[];
    accounts?: Record<string, unknown>[];
    settings?: Record<string, unknown>;
  };

  // --- Products ---
  const products = store.products ?? [];
  if (products.length) {
    console.log(`🛒 Upserting ${products.length} products ...`);
    const { error } = await supabase.from("products").upsert(products, { onConflict: "id" });
    if (error) {
      console.error("  ❌ Products error:", error.message);
    } else {
      console.log("  ✅ Products seeded.");
    }
  }

  // --- Orders ---
  const orders = store.orders ?? [];
  if (orders.length) {
    console.log(`📋 Upserting ${orders.length} orders ...`);
    const { error } = await supabase.from("orders").upsert(orders, { onConflict: "id" });
    if (error) {
      console.error("  ❌ Orders error:", error.message);
    } else {
      console.log("  ✅ Orders seeded.");
    }
  } else {
    console.log("📋 No orders to seed.");
  }

  // --- Accounts ---
  const accounts = store.accounts ?? [];
  if (accounts.length) {
    console.log(`👤 Upserting ${accounts.length} accounts ...`);
    const { error } = await supabase.from("accounts").upsert(accounts, { onConflict: "id" });
    if (error) {
      console.error("  ❌ Accounts error:", error.message);
    } else {
      console.log("  ✅ Accounts seeded.");
    }
  } else {
    console.log("👤 No accounts to seed.");
  }

  // --- Settings ---
  if (store.settings) {
    console.log("⚙️  Upserting settings ...");
    const { error } = await supabase
      .from("settings")
      .upsert({ id: "main", ...store.settings }, { onConflict: "id" });

    if (error) {
      console.error("  ❌ Settings error:", error.message);
    } else {
      console.log("  ✅ Settings seeded.");
    }
  }

  console.log("\n🎉 Seed complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
