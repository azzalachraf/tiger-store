import { createClient } from "@supabase/supabase-js";

// One-time production data migration; historic orders and sales are untouched.
async function main() {
  if (process.env.VERCEL_ENV !== "production") return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Price migration requires the production database connection.");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const marker = "migration_snapchat_12m_2500_v1";
  const { data: done, error: markerError } = await db.from("business_settings").select("key").eq("key", marker).maybeSingle();
  if (markerError) throw new Error("Price migration marker could not be read.");
  if (done) return;
  const { data: product, error } = await db.from("products").select("id,priceOptions").eq("slug", "snapchat-plus").single();
  if (error || !product || !Array.isArray(product.priceOptions)) throw new Error("Snapchat offers could not be read.");
  const options = product.priceOptions as Record<string, unknown>[];
  let found = false;
  const updated = options.map(offer => {
    if (!/^12[ -]months?$/i.test(String(offer.duration))) return offer;
    found = true;
    return { ...offer, price: 2500 };
  });
  if (!found) throw new Error("The Snapchat annual offer was not found.");
  const { data: changed, error: updateError } = await db.from("products").update({ priceOptions: updated }).eq("id", product.id).eq("priceOptions", JSON.stringify(options)).select("id");
  if (updateError || changed?.length !== 1) throw new Error("Snapchat price update failed or concurrent edit detected.");
  const { data: finance, error: financeError } = await db.from("finance_settings").select("snapchat_plans").eq("id", "main").maybeSingle();
  if (financeError) throw new Error("Finance configuration could not be read.");
  if (finance) {
    const plans = finance.snapchat_plans as Record<string, Record<string, unknown>>;
    const { data: saved, error: saveError } = await db.from("finance_settings").update({ snapchat_plans: { ...plans, "12": { ...plans["12"], price_dzd: 2500 } } }).eq("id", "main").eq("snapchat_plans", JSON.stringify(plans)).select("id");
    if (saveError || saved?.length !== 1) throw new Error("Finance price update failed or concurrent edit detected.");
  }
  const { error: finishError } = await db.from("business_settings").upsert({ key: marker, value: { appliedAt: new Date().toISOString(), priceDzd: 2500 } }, { onConflict: "key" });
  if (finishError) throw new Error("Price migration completion could not be recorded.");
  console.log("Snapchat annual price updated to 2500 DA; historical records preserved.");
}

main().catch(() => { console.error("Snapchat price migration failed. No credentials were logged."); process.exitCode = 1; });
