import "server-only";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase";
export async function readAdminTraffic(range: {
  startIso: string;
  endExclusiveIso: string;
}) {
  await requireAdmin();
  const visitors = new Set<string>();
  const conversions = new Set<string>();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await getSupabaseServiceClient()
      .from("page_events")
      .select("id,event_type,session_id")
      .in("event_type", ["page_view", "purchase_completed"])
      .gte("created_at", range.startIso)
      .lt("created_at", range.endExclusiveIso)
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Traffic could not be loaded.");
    for (const row of data ?? []) {
      const key = String(row.session_id || "legacy:" + row.id);
      if (row.event_type === "page_view") visitors.add(key);
      else conversions.add(key);
    }
    if (!data || data.length < 500) break;
  }
  return {
    visitors: visitors.size,
    conversions: conversions.size,
    conversionRate: visitors.size
      ? Number(((conversions.size / visitors.size) * 100).toFixed(1))
      : 0,
  };
}
