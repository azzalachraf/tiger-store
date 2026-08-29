export type AnalyticsRange = { start: string; end: string; label: string };
export type AnalyticsSale = { order_id: string; admin_telegram_user_id: string | number; plan_months: number; revenue_dzd: number; commission_dzd: number; card_cost_dzd: number; completed_at: string };
export type AnalyticsSpend = { id: string; spend_date: string; amount_usd_cents: number | null; source_id: string | null };

export function algeriaDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function rangeFor(kind: "today" | "month" | "yesterday", now = new Date()): AnalyticsRange {
  const today = algeriaDate(now);
  if (kind === "today") return { start: today, end: today, label: "today" };
  if (kind === "yesterday") { const date = new Date(`${today}T12:00:00+01:00`); date.setDate(date.getDate() - 1); const day = algeriaDate(date); return { start: day, end: day, label: "yesterday" }; }
  return { start: `${today.slice(0, 7)}-01`, end: today, label: "month" };
}

export function buildOwnerAnalytics(range: AnalyticsRange, sales: AnalyticsSale[], spends: AnalyticsSpend[], usdDzdRate: number, inventoryAvailable = 0) {
  const selectedSales = sales.filter((sale) => { const day = algeriaDate(sale.completed_at); return day >= range.start && day <= range.end; });
  const selectedSpends = spends.filter((spend) => spend.spend_date >= range.start && spend.spend_date <= range.end);
  const spendByDay = new Map<string, number>();
  const presentSpendDays = new Set(selectedSpends.map((spend) => spend.spend_date));
  for (const spend of selectedSpends) spendByDay.set(spend.spend_date, (spendByDay.get(spend.spend_date) ?? 0) + Math.floor((spend.amount_usd_cents ?? 0) * usdDzdRate / 100));
  const dailyCounts = new Map<string, number>();
  for (const sale of selectedSales) { const day = algeriaDate(sale.completed_at); dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1); }
  const allocatedAdvertising = selectedSales.reduce((sum, sale, index) => { const day = algeriaDate(sale.completed_at); const total = spendByDay.get(day) ?? 0; const count = dailyCounts.get(day) ?? 1; const earlier = selectedSales.slice(0, index).filter((item) => algeriaDate(item.completed_at) === day).length; return sum + Math.floor(total / count) + (earlier < total % count ? 1 : 0); }, 0);
  const revenueDzd = selectedSales.reduce((sum, sale) => sum + Number(sale.revenue_dzd), 0);
  const cardCostsDzd = selectedSales.reduce((sum, sale) => sum + Number(sale.card_cost_dzd), 0);
  const commissionsDzd = selectedSales.reduce((sum, sale) => sum + Number(sale.commission_dzd), 0);
  const planCounts = Object.fromEntries([1, 2, 3, 6, 12].map((plan) => [String(plan), selectedSales.filter((sale) => Number(sale.plan_months) === plan).length]));
  const adminCounts = Object.fromEntries([...new Set(selectedSales.map((sale) => String(sale.admin_telegram_user_id)))].map((id) => [id, selectedSales.filter((sale) => String(sale.admin_telegram_user_id) === id).length]));
  const missingAdvertisingDates = [...dailyCounts.keys()].filter((date) => !presentSpendDays.has(date)).sort();
  const operatingProfitDzd = revenueDzd - cardCostsDzd - commissionsDzd;
  return { range, totalOrders: selectedSales.length, revenueDzd, cardCostsDzd, commissionsDzd, advertisingDzd: allocatedAdvertising, costPerOrderDzd: selectedSales.length ? Math.floor((cardCostsDzd + allocatedAdvertising) / selectedSales.length) : null, marginDzd: revenueDzd ? Math.floor(operatingProfitDzd * 100 / revenueDzd) : null, netProfitDzd: operatingProfitDzd - allocatedAdvertising, planCounts, adminCounts, inventoryAvailable, missingAdvertisingDates };
}
