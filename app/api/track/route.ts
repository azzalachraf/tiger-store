import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { normalizeClientIp } from "@/lib/admin-network";
import { recordPageEvent } from "@/lib/page-events";
import { isSiteIpBanned, recordSiteVisitor } from "@/lib/site-visitors";
import { pageEventInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * POST /api/track
 * Receives lightweight tracking events from the browser.
 * No auth required — this is a public tracking endpoint.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = pageEventInputSchema.parse(body);

    const requestHeaders = await headers();
    const ip = normalizeClientIp(requestHeaders.get("x-forwarded-for"));
    if (await isSiteIpBanned(ip)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    if (event.event_type === "page_view" && event.visitor_id && event.session_id) {
      await recordSiteVisitor({
        visitorId: event.visitor_id,
        sessionId: event.session_id,
        ip,
        userAgent: requestHeaders.get("user-agent") ?? "",
        page: event.page_url ?? "/",
      });
    }

    const pageEvent = { ...event };
    delete pageEvent.visitor_id;
    await recordPageEvent(pageEvent);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
