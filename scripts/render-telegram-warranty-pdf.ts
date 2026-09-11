import { mkdir, writeFile } from "node:fs/promises";
import { createTelegramWarrantyPdf } from "../lib/telegram-warranty-pdf";
async function main() {
  await mkdir("tmp/pdfs", { recursive: true });
  for (const [label,name] of [["latin","Client Test"],["arabic","أحمد بن يوسف"],["long","أحمد محمد عبد الرحمن بن يوسف ".repeat(5)]]) {
    const pdf = await createTelegramWarrantyPdf({ certificateCode: "TW-TEST123456", orderCode: "TS-TEST123456", name, username: "snapchat_test", platform: "Instagram", plan: "12 mois", startsAt: "2026-08-28T12:00:00.000Z", endsAt: "2027-09-04T12:00:00.000Z" });
    await writeFile(`tmp/pdfs/telegram-warranty-${label}.pdf`, pdf);
    if (pdf.byteLength < 10000) throw new Error("Certificate font missing.");
  }
  console.log("Generated French certificates with Latin, Arabic and long names.");
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
