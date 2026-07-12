import { NextResponse } from "next/server";
import { recordPageEvent } from "@/lib/page-events";
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

    await recordPageEvent(event);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
