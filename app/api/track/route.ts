import { NextResponse } from "next/server";
import { recordPageEvent } from "@/lib/page-events";
import { pageEventInputSchema } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/request-security";
import { isPublicTrackingPath, safeTrackingUrl } from "@/lib/tracking-policy";

export const runtime = "nodejs";

/**
 * POST /api/track
 * Receives lightweight tracking events from the browser.
 * No auth required — this is a public tracking endpoint.
 */
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length")) > 4096) return NextResponse.json({ error: "Invalid request" }, { status: 413 });
    await enforceRateLimit("track", request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown", 120, 60);
    const text = await request.text();
    if (text.length > 4096) return NextResponse.json({ error: "Invalid request" }, { status: 413 });
    const body = JSON.parse(text);
    const event = pageEventInputSchema.parse(body);

    if (!isPublicTrackingPath(event.page_url ?? "/")) return NextResponse.json({ ok: true });
    await recordPageEvent({ ...event, page_url: safeTrackingUrl(event.page_url), referrer: safeTrackingUrl(event.referrer) });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
