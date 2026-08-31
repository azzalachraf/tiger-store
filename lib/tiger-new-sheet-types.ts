export const tigerNewSheetHeaders = ["Client", "Subscription", "Duration", "Cost Price", "Amount Paid", "Spend", "Cost", "Net Profit", "Payment Method", "admin"] as const;

export type TigerNewSheetRow = {
  orderId: string;
  client: string;
  subscription: string;
  duration: string;
  costPrice: string;
  amountPaid: string;
  spend: string;
  cost: string;
  netProfit: string;
  paymentMethod: string;
  admin: string;
};
