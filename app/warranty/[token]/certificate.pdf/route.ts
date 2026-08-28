import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrderById } from "@/lib/admin-store";
import { createWarrantyPdf } from "@/lib/warranty-pdf";
import { directWarrantyOrderId, verifyWarrantyLink, warrantyCertificateCode, warrantyClaimCookieName, verifyWarrantyClaimCookie } from "@/lib/warranty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = verifyWarrantyLink(token);
  if (!payload) return new NextResponse("Not found", { status: 404 });
  const order = await getOrderById(payload.source === "direct" ? directWarrantyOrderId(payload) : payload.orderId);
  const item = order?.products[payload.source === "direct" ? 0 : payload.itemIndex];
  const recipientName = verifyWarrantyClaimCookie(payload, (await cookies()).get(warrantyClaimCookieName(token))?.value);
  if (!order || order.status !== "delivered" || !item || !recipientName) return new NextResponse("Not found", { status: 404 });

  const pdf = await createWarrantyPdf({
    payload,
    recipientName,
    productName: item.name,
    planName: item.option,
    orderCode: order.id,
  });
  const filename = `${warrantyCertificateCode(payload)}.pdf`;
  const body = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(body).set(pdf);
  return new NextResponse(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
