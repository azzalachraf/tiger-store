import "server-only";
import { createHmac } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";
export async function enforceRateLimit(scope: string, ip: string, limit: number, seconds: number) {
  const key = createHmac("sha256", getServerEnv().ENCRYPTION_KEY).update(`${scope}:${ip}`).digest("hex");
  const { data, error } = await getSupabaseServiceClient().rpc("take_request_limit", { p_key: key, p_limit: limit, p_seconds: seconds });
  if (error || data !== true) throw new Error("Request limit reached. Please try again later.");
}
