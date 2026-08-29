import "server-only";

import { createSign } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { parseRedeemCardsSheet, type SheetRedeemCode } from "@/lib/redeem-sheet-parser";

type GoogleValuesResponse = { values?: unknown[][] };
export type { SheetRedeemCode } from "@/lib/redeem-sheet-parser";

function encode(value: string) { return Buffer.from(value).toString("base64url"); }

async function googleAccessToken() {
  const env = getServerEnv();
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error("Google Sheets service-account settings are missing.");
  }
  const now = Math.floor(Date.now() / 1000);
  const payload = encode(JSON.stringify({ iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, scope: "https://www.googleapis.com/auth/spreadsheets.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const header = encode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  const assertion = `${header}.${payload}.${signer.sign(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  if (!response.ok) throw new Error("Google Sheets authorization failed.");
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Google Sheets authorization failed.");
  return body.access_token;
}

export async function readRedeemCardsSheet(): Promise<SheetRedeemCode[]> {
  const env = getServerEnv();
  if (!env.GOOGLE_REDEEM_SHEET_ID || !env.GOOGLE_REDEEM_SHEET_TAB) throw new Error("Google redeem-sheet settings are missing.");
  const token = await googleAccessToken();
  const range = `'${env.GOOGLE_REDEEM_SHEET_TAB.replace(/'/g, "''")}'!A:Z`;
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.GOOGLE_REDEEM_SHEET_ID)}/values/${encodeURIComponent(range)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Google Sheets inventory read failed.");
  const body = await response.json() as GoogleValuesResponse;
  return parseRedeemCardsSheet(body.values ?? []);
}
