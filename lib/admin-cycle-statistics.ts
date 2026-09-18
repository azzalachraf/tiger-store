export type AdminCycleStatistics = { completedOrders: number; creditDzd: number; settledAt: string | null };
export type AdminStatisticsRange = { start: string; end: string } | null;

function algeriaDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function calculateAdminCycleStatistics(
  sales: Array<{ commission_dzd: number; completed_at: string }>,
  settledAt: string | null,
  range: AdminStatisticsRange = null,
): AdminCycleStatistics {
  const currentSales = settledAt
    ? sales.filter((sale) => new Date(sale.completed_at).getTime() > new Date(settledAt).getTime())
    : sales;
  const selectedSales = range
    ? currentSales.filter((sale) => {
        const day = algeriaDate(sale.completed_at);
        return day >= range.start && day <= range.end;
      })
    : currentSales;
  return {
    completedOrders: selectedSales.length,
    creditDzd: selectedSales.reduce((sum, sale) => sum + Number(sale.commission_dzd), 0),
    settledAt,
  };
}
