import { NextResponse } from "next/server";
import { requireAdminAction } from "@/lib/admin-auth";
import { markTigerNewSheetRowsCopied } from "@/lib/tiger-new-sheet";
import { z } from "zod";

export const runtime = "nodejs";

const inputSchema = z.object({
  orderIds: z.array(z.string().trim().regex(/^[A-Za-z0-9_-]{1,160}$/)).min(1).max(200),
}).strict();

export async function POST(request: Request) {
  try {
    await requireAdminAction();
    const body: unknown = await request.json();
    const input = inputSchema.safeParse(body);
    if (!input.success) return NextResponse.json({ error: "Invalid copy selection." }, { status: 400 });
    const copiedOrderIds = await markTigerNewSheetRowsCopied(input.data.orderIds);
    return NextResponse.json({ copiedOrderIds });
  } catch {
    return NextResponse.json({ error: "Copy state could not be saved." }, { status: 500 });
  }
}
