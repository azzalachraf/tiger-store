import "server-only";

import { createSign } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { getAdminFinanceSummary, getFinanceReports, reconcileFinanceReports } from "@/lib/finance";
import { cardLabel, type SnapchatCardType } from "@/lib/snapchat-cards";
import { getOrders } from "@/lib/admin-store";

function encode(value: string) { return Buffer.from(value).toString("base64url"); }
async function accessToken() {
  const env = getServerEnv();
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) throw new Error("Google Sheets service-account settings are missing.");
  const now = Math.floor(Date.now() / 1000);
  const header = encode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = encode(JSON.stringify({ iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256"); signer.update(`${header}.${payload}`); signer.end();
  const assertion = `${header}.${payload}.${signer.sign(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n")).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  const body = await response.json() as { access_token?: string };
  if (!response.ok || !body.access_token) throw new Error("Google Sheets authorization failed.");
  return body.access_token;
}
async function sheetsRequest(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) }, cache: "no-store" });
  if (!response.ok) throw new Error("Google finance sheet synchronization failed.");
  return response.json() as Promise<Record<string, unknown>>;
}
function monthKey(value: string) { return value.slice(0, 7); }
function safeAdminSheetName(name: string, month: string) { return `Admin ${name.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20) || "admin"} ${month}`.slice(0, 99); }

export async function syncFinanceReporting() {
  const env = getServerEnv();
  const [reports, reconciliation] = await Promise.all([getFinanceReports(), reconcileFinanceReports()]);
  if (reconciliation.mismatchCount) throw new Error("Finance reconciliation failed.");
  const sheetId = reports.settings.reportingSheetId || env.GOOGLE_FINANCE_SHEET_ID;
  if (!sheetId) throw new Error("The central finance spreadsheet ID is missing.");
  const metadata = await sheetsRequest(encodeURIComponent(sheetId));
  const tabs = new Set(((metadata.sheets as { properties?: { title?: string } }[] | undefined) ?? []).map((sheet) => sheet.properties?.title).filter((name): name is string => Boolean(name)));
  const required = ["Income", "Daily Profit", "Advertising", "Admin Summary", "Inventory"];
  const months = [...new Set([new Date().toISOString().slice(0, 7), ...reports.sales.map((sale) => monthKey(String(sale.completed_at)))])];
  for (const admin of reports.admins) for (const month of months) required.push(safeAdminSheetName(String(admin.telegram_user_id), month));
  const missing = required.filter((name) => !tabs.has(name));
  if (missing.length) await sheetsRequest(`${encodeURIComponent(sheetId)}:batchUpdate`, { method: "POST", body: JSON.stringify({ requests: missing.map((title) => ({ addSheet: { properties: { title } } })) }) });
  const income = [["Completed at", "Order", "Plan", "Card type", "Revenue DZD", "Commission DZD", "Card cost DZD", "Gross profit DZD"], ...reports.sales.map((sale) => [String(sale.completed_at), String(sale.order_id), Number(sale.plan_months), cardLabel(sale.card_type as SnapchatCardType, "en"), Number(sale.revenue_dzd), Number(sale.commission_dzd), Number(sale.card_cost_dzd), Number(sale.gross_profit_dzd)])];
  const daily = new Map<string, number[]>();
  for (const sale of reports.sales) { const date = String(sale.completed_at).slice(0, 10); const row = daily.get(date) ?? [0, 0, 0, 0]; row[0] += Number(sale.revenue_dzd); row[1] += Number(sale.commission_dzd); row[2] += Number(sale.card_cost_dzd); row[3] += Number(sale.gross_profit_dzd); daily.set(date, row); }
  for (const spend of reports.advertisingSpend) { const row = daily.get(String(spend.spend_date)) ?? [0, 0, 0, 0]; row[3] -= Number.isInteger(spend.amount_usd_cents) ? Math.floor(Number(spend.amount_usd_cents) * reports.settings.usdDzdRate / 100) : Number(spend.amount_dzd); daily.set(String(spend.spend_date), row); }
  const dailyProfit = [["Date", "Revenue DZD", "Commission DZD", "Card cost DZD", "Net profit after ads DZD"], ...[...daily.entries()].map(([date, values]) => [date, ...values])];
  const adminSummary = [["Admin ID", "Completed orders", "Commission DZD", "Paid DZD", "Adjustments DZD", "Remaining credit DZD", "Next payment date"], ...await Promise.all(reports.admins.map(async (admin) => { const s = await getAdminFinanceSummary(String(admin.telegram_user_id)); return [s.adminId, s.completedOrders, s.commissionDzd, s.paidDzd, s.adjustmentsDzd, s.remainingDzd, s.nextPaymentDate]; }))];
  const counts = new Map<string, number>(); for (const card of reports.cards) if (card.status === "available") counts.set(String(card.card_type), (counts.get(String(card.card_type)) ?? 0) + 1);
  const inventory = [["Card type", "Available codes"], ...Object.entries(reports.settings.cardCostsUsdCents).map(([type]) => [cardLabel(type as SnapchatCardType, "en"), counts.get(type) ?? 0])];
  const advertising = [["Date", "Platform", "Campaign", "Spend DZD", "Notes"], ...reports.advertisingSpend.map((spend) => [String(spend.spend_date), String(spend.platform), String(spend.campaign), Number.isInteger(spend.amount_usd_cents) ? Math.floor(Number(spend.amount_usd_cents) * reports.settings.usdDzdRate / 100) : Number(spend.amount_dzd), String(spend.note)])];
  const values = [{ range: "Income!A1", values: income }, { range: "Daily Profit!A1", values: dailyProfit }, { range: "Advertising!A1", values: advertising }, { range: "Admin Summary!A1", values: adminSummary }, { range: "Inventory!A1", values: inventory }];
  const orders = await getOrders();
  for (const admin of reports.admins) for (const month of months) {
    const name = safeAdminSheetName(String(admin.telegram_user_id), month);
    const own = reports.sales.filter((sale) => String(sale.admin_telegram_user_id) === String(admin.telegram_user_id) && monthKey(String(sale.completed_at)) === month);
    values.push({ range: `'${name}'!A1`, values: [["Completed at", "Order", "Customer", "Phone", "Product", "Plan", "Revenue DZD", "Commission DZD"], ...own.map((sale) => { const order = orders.find((item) => item.id === sale.order_id); const item = order?.products[0]; return [String(sale.completed_at), String(sale.order_id), order?.customerName ?? "", order?.phone ?? "", item?.name ?? "Snapchat Plus", item?.option ?? `${sale.plan_months} months`, Number(sale.revenue_dzd), Number(sale.commission_dzd)]; })] });
  }
  await sheetsRequest(`${encodeURIComponent(sheetId)}/values:batchClear`, { method: "POST", body: JSON.stringify({ ranges: values.map((entry) => entry.range.replace(/!A1$/, "!A:Z")) }) });
  await sheetsRequest(`${encodeURIComponent(sheetId)}/values:batchUpdate`, { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data: values }) });
  return { sheetId, tabs: required.length, sales: reports.sales.length, reconciliation };
}
