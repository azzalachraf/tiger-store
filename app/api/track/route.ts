import { NextResponse } from "next/server";
import { recordPageEvent } from "@/lib/page-events";

export const runtime = "nodejs";

/**
 * POST /api/track
 * Receives lightweight tracking events from the browser.
 * No auth required — this is a public tracking endpoint.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      event_type,
      page_url,
      product_id,
      session_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer,
    } = body;

    if (!event_type || typeof event_type !== "string") {
      return NextResponse.json({ error: "event_type required" }, { status: 400 });
    }

    await recordPageEvent({
      event_type,
      page_url,
      product_id,
      session_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
