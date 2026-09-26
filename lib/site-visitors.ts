import "server-only";

import { decryptAdminIp, encryptAdminIp, hashAdminIp } from "@/lib/admin-network";
import { getSupabaseServiceClient } from "@/lib/supabase";

export async function isSiteIpBanned(ip: string) {
  const { data, error } = await getSupabaseServiceClient().from("site_ip_bans")
    .select("ip_hash").eq("ip_hash", hashAdminIp(ip)).maybeSingle();
  if (error) throw new Error("Site ban list is unavailable.");
  return Boolean(data);
}

export async function recordSiteVisitor(input: { visitorId: string; sessionId: string; ip: string; userAgent: string; page: string }) {
  const client = getSupabaseServiceClient();
  const now = new Date().toISOString();
  const { data: existing, error: readError } = await client.from("site_visitor_devices")
    .select("page_views").eq("id", input.visitorId).maybeSingle<{ page_views: number }>();
  if (readError) throw new Error("Visitor device store is unavailable.");
  const values = {
    session_id: input.sessionId,
    ip_hash: hashAdminIp(input.ip),
    ip_encrypted: encryptAdminIp(input.ip),
    user_agent: input.userAgent.slice(0, 1000),
    last_seen_at: now,
    last_page: input.page.slice(0, 500) || "/",
    page_views: Number(existing?.page_views ?? 0) + 1,
  };
  const result = existing
    ? await client.from("site_visitor_devices").update(values).eq("id", input.visitorId)
    : await client.from("site_visitor_devices").insert({ id: input.visitorId, first_seen_at: now, ...values });
  if (result.error) throw new Error("Visitor device could not be recorded.");
}

export async function getSiteVisitorOverview() {
  const client = getSupabaseServiceClient();
  const activeAfter = Date.now() - 15 * 60 * 1000;
  const [devicesResult, bansResult] = await Promise.all([
    client.from("site_visitor_devices").select("id, session_id, ip_hash, ip_encrypted, user_agent, first_seen_at, last_seen_at, last_page, page_views")
      .order("last_seen_at", { ascending: false }).limit(200),
    client.from("site_ip_bans").select("ip_hash, ip_encrypted, reason, created_by_email, banned_at").order("banned_at", { ascending: false }),
  ]);
  if (devicesResult.error || bansResult.error) throw new Error("Site visitor data could not be loaded.");
  const bannedHashes = new Set((bansResult.data ?? []).map((row) => String(row.ip_hash)));
  return {
    devices: (devicesResult.data ?? []).map((row) => ({
      id: String(row.id), sessionId: String(row.session_id), ipHash: String(row.ip_hash), ip: decryptAdminIp(String(row.ip_encrypted)),
      userAgent: String(row.user_agent), firstSeenAt: String(row.first_seen_at), lastSeenAt: String(row.last_seen_at),
      lastPage: String(row.last_page), pageViews: Number(row.page_views), isBanned: bannedHashes.has(String(row.ip_hash)),
      isActive: new Date(String(row.last_seen_at)).getTime() >= activeAfter,
    })),
    bans: (bansResult.data ?? []).map((row) => ({
      ipHash: String(row.ip_hash), ip: decryptAdminIp(String(row.ip_encrypted)), reason: String(row.reason),
      createdByEmail: String(row.created_by_email), bannedAt: String(row.banned_at),
    })),
  };
}
