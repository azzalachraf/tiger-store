export const tigerNewSheetHeaders = ["Client", "Subscription", "Duration", "Cost Price", "Amount Paid", "Spend", "Cost", "Net Profit", "Payment Method", "admin"] as const;

export type TigerNewSheetRow = {
  orderId: string;
  orderStatus: "completed" | "pending" | "cancelled";
  missingDetails: boolean;
  copied: boolean;
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

export type TigerNewSheetData = {
  rows: TigerNewSheetRow[];
  totals: { all: number; completed: number; pending: number; cancelled: number; missingDetails: number; copied: number; uncopied: number };
};
