export type AdminCycleStatistics = { completedOrders: number; creditDzd: number; settledAt: string | null };

export function calculateAdminCycleStatistics(
  sales: Array<{ commission_dzd: number; completed_at: string }>,
  settledAt: string | null,
): AdminCycleStatistics {
  const currentSales = settledAt
    ? sales.filter((sale) => new Date(sale.completed_at).getTime() > new Date(settledAt).getTime())
    : sales;
  return {
    completedOrders: currentSales.length,
    creditDzd: currentSales.reduce((sum, sale) => sum + Number(sale.commission_dzd), 0),
    settledAt,
  };
}
