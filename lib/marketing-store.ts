import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";
import type { MarketingConfig } from "@/lib/types";
import { marketingConfigSchema } from "@/lib/validation";

const supabaseService = getSupabaseServiceClient();

const defaultConfig: MarketingConfig = {
  id: "main",
  meta_pixel_id: "",
  meta_pixel_enabled: false,
  meta_capi_token: "",
  meta_capi_enabled: false,
  updated_at: new Date().toISOString(),
};

export async function getMarketingConfig(): Promise<MarketingConfig> {
  try {
    const { data, error } = await supabaseService
      .from("marketing_config")
      .select("*")
      .eq("id", "main")
      .maybeSingle();

    if (error) {
      throw new Error("Marketing configuration unavailable.");
    }
    if (!data) return defaultConfig;
    const parsed = marketingConfigSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error("Marketing configuration invalid.");
    }
    return parsed.data;
  } catch {
    throw new Error("Marketing configuration unavailable.");
  }
}

export async function saveMarketingConfig(
  config: Partial<MarketingConfig>
): Promise<void> {
  const payload = marketingConfigSchema.parse({ id: "main", ...config, updated_at: new Date().toISOString() });
  const { error } = await supabaseService
    .from("marketing_config")
    .upsert(payload, { onConflict: "id" });
  if (error) throw new Error("Marketing configuration could not be saved.");
}


