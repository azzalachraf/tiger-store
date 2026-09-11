import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { type PDFDocument, type PDFFont } from "pdf-lib";

export async function embedCertificateFont(pdf: PDFDocument) {
  pdf.registerFontkit(fontkit);
  return pdf.embedFont(await readFile(join(process.cwd(), "assets/fonts/NotoSansArabic.ttf")), { subset: true });
}

/** Fit a customer-controlled string without overlapping another field. */
export function fittedPdfText(font: PDFFont, value: string, maxWidth: number, preferredSize: number) {
  const text = value.replace(/[\r\n\t\u0000-\u001f]/g, " ").trim();
  const width = font.widthOfTextAtSize(text, preferredSize);
  return { text, size: width > maxWidth ? preferredSize * maxWidth / width : preferredSize };
}
