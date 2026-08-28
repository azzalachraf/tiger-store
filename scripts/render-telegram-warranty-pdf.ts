import { mkdir, writeFile } from "node:fs/promises";
import { createTelegramWarrantyPdf } from "../lib/telegram-warranty-pdf";
async function main() { await mkdir("tmp/pdfs", { recursive: true }); const pdf = await createTelegramWarrantyPdf({ certificateCode: "TW-TEST123456", orderCode: "TS-TEST123456", name: "Client Test", username: "snapchat_test", platform: "iPhone", plan: "12 months", startsAt: "2026-08-28T12:00:00.000Z", endsAt: "2027-09-04T12:00:00.000Z" }); await writeFile("tmp/pdfs/telegram-warranty-sample.pdf", pdf); }
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
