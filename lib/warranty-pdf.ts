import "server-only";

import { readFile } from "fs/promises";
import { join } from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { warrantyCertificateCode, warrantyEndDate, type WarrantyLinkPayload } from "@/lib/warranty";

type CertificatePdfInput = {
  payload: WarrantyLinkPayload;
  recipientName: string;
  productName: string;
  planName: string;
  orderCode: string;
};

const ORANGE = rgb(1, 0.45, 0);
const INK = rgb(0.09, 0.07, 0.06);
const MUTED = rgb(0.35, 0.32, 0.29);

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(value);
}

export async function createWarrantyPdf(input: CertificatePdfInput) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontBytes = await readFile(join(process.cwd(), "assets", "fonts", "NotoNaskhArabic-Regular.ttf"));
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const issuedAt = new Date(input.payload.issuedAt);
  const endsAt = warrantyEndDate(input.payload);
  const certificateCode = warrantyCertificateCode(input.payload);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 0.972, 0.94) });
  page.drawRectangle({ x: 32, y: 32, width: width - 64, height: height - 64, borderColor: ORANGE, borderWidth: 1.5 });
  page.drawRectangle({ x: 32, y: height - 155, width: width - 64, height: 123, color: INK });
  page.drawText("TIGER STORE", { x: 57, y: height - 88, size: 25, font, color: rgb(1, 0.98, 0.94) });
  page.drawText("WARRANTY CERTIFICATE", { x: 57, y: height - 118, size: 15, font, color: ORANGE });
  page.drawText("Digital subscription coverage", { x: 57, y: height - 140, size: 10, font, color: rgb(0.85, 0.81, 0.76) });

  page.drawText("This confirms the warranty coverage for", { x: 57, y: height - 215, size: 13, font, color: MUTED });
  page.drawText(input.recipientName, { x: 57, y: height - 253, size: 27, font, color: INK });
  page.drawLine({ start: { x: 57, y: height - 264 }, end: { x: width - 57, y: height - 264 }, thickness: 0.7, color: rgb(0.84, 0.78, 0.71) });

  const rows = [
    ["Product", input.productName],
    ["Plan", input.planName],
    ["Order code", input.orderCode],
    ["Certificate", certificateCode],
    ["Coverage", `${input.payload.coveredDays} days`],
    ["Issued", formatDate(issuedAt)],
    ["Coverage ends", formatDate(endsAt)],
  ];
  let y = height - 310;
  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), { x: 57, y, size: 8.5, font, color: MUTED });
    page.drawText(value, { x: 210, y: y - 1, size: 12, font, color: INK, maxWidth: 320 });
    page.drawLine({ start: { x: 57, y: y - 15 }, end: { x: width - 57, y: y - 15 }, thickness: 0.45, color: rgb(0.86, 0.81, 0.75) });
    y -= 38;
  }

  page.drawRectangle({ x: 57, y: 144, width: width - 114, height: 105, color: rgb(1, 0.92, 0.84), borderColor: rgb(0.94, 0.71, 0.49), borderWidth: 0.7 });
  page.drawText("Coverage terms", { x: 74, y: 223, size: 13, font, color: INK });
  const terms = [
    "For a covered failure caused by Tiger Store, we attempt replacement first.",
    "If replacement is impossible, the unused covered period is refunded proportionally.",
    "Customer-caused problems are not covered.",
  ];
  terms.forEach((term, index) => page.drawText(`• ${term}`, { x: 74, y: 199 - index * 19, size: 9.2, font, color: MUTED, maxWidth: width - 150 }));
  page.drawText("Keep this certificate and your order code for support.", { x: 57, y: 90, size: 10, font, color: MUTED });
  page.drawText("Tiger Store", { x: width - 135, y: 56, size: 11, font, color: ORANGE });
  return pdf.save();
}
