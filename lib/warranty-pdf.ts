import "server-only";

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(value);
}

export async function createWarrantyPdf(input: CertificatePdfInput) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const issuedAt = new Date(input.payload.issuedAt);
  const endsAt = warrantyEndDate(input.payload);
  const certificateCode = warrantyCertificateCode(input.payload);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 0.972, 0.94) });
  page.drawRectangle({ x: 32, y: 32, width: width - 64, height: height - 64, borderColor: ORANGE, borderWidth: 1.5 });
  page.drawRectangle({ x: 32, y: height - 155, width: width - 64, height: 123, color: INK });
  page.drawText("TIGER STORE", { x: 57, y: height - 88, size: 25, font: bold, color: rgb(1, 0.98, 0.94) });
  page.drawText("CERTIFICAT DE GARANTIE", { x: 57, y: height - 118, size: 15, font: bold, color: ORANGE });
  page.drawText("Couverture pour abonnement numerique", { x: 57, y: height - 140, size: 10, font, color: rgb(0.85, 0.81, 0.76) });

  page.drawText("Ce certificat confirme la couverture de garantie de", { x: 57, y: height - 215, size: 13, font, color: MUTED });
  page.drawText(input.recipientName, { x: 57, y: height - 253, size: 27, font: bold, color: INK });
  page.drawLine({ start: { x: 57, y: height - 264 }, end: { x: width - 57, y: height - 264 }, thickness: 0.7, color: rgb(0.84, 0.78, 0.71) });

  const rows = [
    ["PRODUIT", input.productName],
    ["FORMULE", input.planName],
    ["CODE COMMANDE", input.orderCode],
    ["CODE CERTIFICAT", certificateCode],
    ["COUVERTURE", `${input.payload.coveredDays} jours`],
    ["EMIS LE", formatDate(issuedAt)],
    ["FIN DE COUVERTURE", formatDate(endsAt)],
  ];
  let y = height - 310;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 57, y, size: 8.5, font: bold, color: MUTED });
    page.drawText(value, { x: 210, y: y - 1, size: 12, font: bold, color: INK, maxWidth: 320 });
    page.drawLine({ start: { x: 57, y: y - 15 }, end: { x: width - 57, y: y - 15 }, thickness: 0.45, color: rgb(0.86, 0.81, 0.75) });
    y -= 38;
  }

  page.drawRectangle({ x: 57, y: 144, width: width - 114, height: 105, color: rgb(1, 0.92, 0.84), borderColor: rgb(0.94, 0.71, 0.49), borderWidth: 0.7 });
  page.drawText("Conditions de garantie", { x: 74, y: 223, size: 13, font: bold, color: INK });
  const terms = [
    "En cas de panne couverte due a Tiger Store, nous tentons d abord un remplacement.",
    "Si le remplacement est impossible, la periode de garantie non utilisee est remboursee au prorata.",
    "Les problemes causes par le client ne sont pas couverts.",
  ];
  terms.forEach((term, index) => page.drawText(`- ${term}`, { x: 74, y: 199 - index * 19, size: 9.2, font, color: MUTED, maxWidth: width - 150 }));
  page.drawText("Conservez ce certificat et votre code commande pour le support.", { x: 57, y: 90, size: 10, font, color: MUTED });
  page.drawText("Tiger Store", { x: width - 135, y: 56, size: 11, font: bold, color: ORANGE });
  return pdf.save();
}
