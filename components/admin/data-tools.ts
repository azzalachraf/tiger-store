import type { AdminOrder } from "@/lib/types";
export type Cell = string | number | boolean | null | undefined;
export function csvCell(value: Cell): string {
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "";
  let text = String(value ?? "");
  if (/^[\s\uFEFF]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function toCsv(headers: string[], rows: Cell[][]) {
  return (
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")
  );
}
function xml(value: Cell) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
export function toExcel(headers: string[], rows: Cell[][]) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Tiger Store"><Table>' +
    [headers, ...rows]
      .map(
        (row) =>
          "<Row>" +
          row
            .map(
              (value) =>
                '<Cell><Data ss:Type="' +
                (typeof value === "number" && Number.isFinite(value)
                  ? "Number"
                  : "String") +
                '">' +
                xml(value) +
                "</Data></Cell>",
            )
            .join("") +
          "</Row>",
      )
      .join("") +
    "</Table></Worksheet></Workbook>"
  );
}
export function downloadTable(
  filename: string,
  headers: string[],
  rows: Cell[][],
  format: "csv" | "excel",
) {
  const content =
    format === "csv" ? toCsv(headers, rows) : toExcel(headers, rows);
  const url = URL.createObjectURL(
    new Blob([content], {
      type:
        format === "csv"
          ? "text/csv;charset=utf-8"
          : "application/vnd.ms-excel;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + (format === "csv" ? ".csv" : ".xml");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function localDay(date: string | Date) {
  const d = new Date(date);
  return Number.isNaN(d.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Algiers",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
}
export function periodStart(period: string, now: Date = new Date()) {
  const day = localDay(now);
  if (period === "all" || period === "custom") return "";
  if (period === "month") return day.slice(0, 7) + "-01";
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(
    d.getUTCDate() - (period === "7" ? 6 : period === "30" ? 29 : 0),
  );
  return d.toISOString().slice(0, 10);
}
export function filterOrders(
  orders: AdminOrder[],
  query: string,
  status: string,
  start: string,
  end: string,
  payment = "all",
) {
  const q = query.trim().toLowerCase();
  return orders.filter(
    (o) =>
      (!q ||
        [
          o.id,
          o.customerName,
          o.phone,
          o.email,
          ...o.products.map((p) => p.name + " " + p.nameAr),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)) &&
      (status === "all" || o.status === status) &&
      (payment === "all" || o.paymentMethod === payment) &&
      (!start || localDay(o.createdAt) >= start) &&
      (!end || localDay(o.createdAt) <= end),
  );
}
export const orderHeaders = [
  "Order ID",
  "Date (Algiers)",
  "Client",
  "Phone",
  "Email",
  "Products",
  "Plans",
  "Quantity",
  "Amount (DA)",
  "Status",
  "Payment method",
  "Customer notes",
  "Admin notes",
];
export function orderCells(order: AdminOrder): Cell[] {
  const day = localDay(order.createdAt);
  return [
    order.id,
    day
      ? day +
        " " +
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Africa/Algiers",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(order.createdAt))
      : "",
    order.customerName,
    order.phone,
    order.email,
    order.products.map((p) => p.name).join(" + "),
    order.products.map((p) => p.option).join(" + "),
    order.products.reduce((s, p) => s + p.quantity, 0),
    order.total,
    order.status,
    order.paymentMethod,
    order.notes,
    order.adminNotes,
  ];
}
