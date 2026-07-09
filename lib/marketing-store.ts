"use server";

import { supabase } from "@/lib/supabase";
import type { MarketingConfig } from "@/lib/types";

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
    const { data, error } = await supabase
      .from("marketing_config")
      .select("*")
      .eq("id", "main")
      .maybeSingle();

    if (error || !data) return defaultConfig;
    return data as MarketingConfig;
  } catch {
    return defaultConfig;
  }
}

export async function saveMarketingConfig(
  config: Partial<MarketingConfig>
): Promise<void> {
  const { error } = await supabase
    .from("marketing_config")
    .upsert(
      { id: "main", ...config, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
  if (error) throw new Error(`saveMarketingConfig failed: ${error.message}`);
}
