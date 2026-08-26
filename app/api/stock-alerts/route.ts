import { NextResponse } from "next/server";
import { createStockAlert } from "@/lib/stock-alerts";
import { stockAlertInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = stockAlertInputSchema.parse(await request.json());
    const result = await createStockAlert(input);
    return NextResponse.json({ ok: true, duplicate: result.duplicate }, { status: result.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
