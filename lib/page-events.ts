import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase";

const supabaseService = getSupabaseServiceClient();

/**
 * Record a page event for funnel / attribution analytics.
 * Called from the /api/track route.
 */
export async function recordPageEvent(event: {
  event_type: string;
  page_url?: string;
  product_id?: string;
  session_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
}) {
  const id = crypto.randomUUID();
  const { error } = await supabaseService.from("page_events").insert({
    id,
    ...event,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("recordPageEvent error:", error.message);
  }
  return id;
}

/** Count events by type within a date range. */
export async function countEventsByType(
  startDate?: string,
  endDate?: string
): Promise<Record<string, number>> {
  let query = supabaseService.from("page_events").select("event_type");
  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data, error } = await query;
  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    const t = (row as { event_type: string }).event_type;
    counts[t] = (counts[t] || 0) + 1;
  }
  return counts;
}

/** Get funnel data from page events. */
export async function getFunnelData(
  startDate?: string,
  endDate?: string
): Promise<{ label: string; count: number; percentage: number; dropOff: number }[]> {
  const counts = await countEventsByType(startDate, endDate);

  const steps = [
    { label: "Page Views", key: "page_view" },
    { label: "Product Views", key: "product_view" },
    { label: "Add to Cart", key: "add_to_cart" },
    { label: "Checkout Started", key: "checkout_started" },
    { label: "Purchase Completed", key: "purchase_completed" },
  ];

  const top = counts[steps[0].key] || 0;

  return steps.map((step, i) => {
    const count = counts[step.key] || 0;
    const percentage = top > 0 ? Math.round((count / top) * 100) : 0;
    const prevCount = i > 0 ? counts[steps[i - 1].key] || 0 : count;
    const dropOff = prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0;
    return { label: step.label, count, percentage, dropOff };
  });
}

/** Get UTM attribution data from orders. */
export async function getAttributionData(
  startDate?: string,
  endDate?: string
) {
  let query = supabaseService
    .from("orders")
    .select("utm_source, utm_medium, utm_campaign, total, status");

  if (startDate) query = query.gte("createdAt", startDate);
  if (endDate) query = query.lte("createdAt", endDate);

  const { data, error } = await query;
  if (error || !data) return { bySource: [], byCampaign: [], byMedium: [] };

  type Row = { utm_source?: string; utm_medium?: string; utm_campaign?: string; total: number; status: string };
  const rows = data as Row[];
  const paid = rows.filter((r) => r.status === "paid" || r.status === "delivered");

  function groupBy(key: keyof Row) {
    const map = new Map<string, { revenue: number; count: number }>();
    for (const row of paid) {
      const val = (row[key] as string) || "Direct";
      const entry = map.get(val) ?? { revenue: 0, count: 0 };
      entry.revenue += Number(row.total);
      entry.count += 1;
      map.set(val, entry);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  return {
    bySource: groupBy("utm_source"),
    byCampaign: groupBy("utm_campaign"),
    byMedium: groupBy("utm_medium"),
  };
}


