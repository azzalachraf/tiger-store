/** Resolve only explicitly configured coverage; unknown/no-warranty is not 365 days. */
export function configuredCoverageDays(policy: string | undefined, duration: string | undefined, start = new Date()): number | null {
  if (!policy || /no warranty|sans garantie|لا يوجد ضمان/i.test(policy)) return null;
  const fullDuration = /offer duration|subscription|طوال مدة|طيلة مدة/i.test(policy);
  const source = fullDuration ? duration ?? "" : policy;
  const amount = Number(source.match(/\d+/)?.[0] ?? (/year|سنة|عام/i.test(source) ? 1 : 0));
  if (!Number.isInteger(amount) || amount < 1 || amount > 120) return null;
  const end = new Date(start);
  if (/year|سنة|عام/i.test(source)) end.setUTCFullYear(end.getUTCFullYear()+amount);
  else if (/month|mois|شهر|أشهر/i.test(source)) end.setUTCMonth(end.getUTCMonth()+amount);
  else if (/day|jour|يوم/i.test(source)) end.setUTCDate(end.getUTCDate()+amount);
  else return null;
  return Math.ceil((end.getTime()-start.getTime())/86400000);
}
