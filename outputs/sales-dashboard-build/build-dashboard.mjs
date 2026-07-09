import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/Achraff/Desktop/Tiger store/site/outputs/sales-dashboard";
const outputPath = `${outputDir}/premium_sales_business_dashboard.xlsx`;

const ROWS = 1000;
const salesStart = 5;
const salesEnd = salesStart + ROWS;
const capStart = 6;
const capEnd = capStart + ROWS;

const colors = {
  blue: "#425D90",
  blueDark: "#263B66",
  blueSoft: "#CFE2F3",
  blueLight: "#DCEBFF",
  red: "#FF8699",
  redSoft: "#F4CCCC",
  green: "#00D084",
  greenSoft: "#D9EAD3",
  yellow: "#FFD966",
  orange: "#F0AD4E",
  white: "#FFFFFF",
  text: "#172033",
  grid: "#AFC4E8",
  canvas: "#F6F8FC",
  input: "#FFF2CC",
};

function setCols(sheet, widths) {
  widths.forEach((w, idx) => {
    sheet.getRange(`${col(idx + 1)}:${col(idx + 1)}`).format.columnWidthPx = w;
  });
}

function col(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}

function fmt(range, props) {
  range.format = props;
}

function fillFormulas(sheet, range, formula) {
  sheet.getRange(range.split(":")[0]).formulas = [[formula]];
  sheet.getRange(range).fillDown();
}

const workbook = Workbook.create();
const sales = workbook.worksheets.add("Sales Dashboard");
const capital = workbook.worksheets.add("Capital & Wallet Tracking");

for (const sheet of [sales, capital]) {
  sheet.showGridLines = false;
}

// Sales dashboard title and table
sales.getRange("A1:I2").merge();
sales.getRange("A1").values = [["TIGER STORE BUSINESS DASHBOARD"]];
fmt(sales.getRange("A1:I2"), {
  fill: colors.blueDark,
  font: { bold: true, color: colors.white, size: 18, typeface: "Montserrat" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
});
sales.getRange("A1:I2").format.rowHeightPx = 34;

sales.getRange("A4:I4").values = [[
  "Client", "Subscription", "Duration", "Cost Price", "Amount Paid", "Net Profit", "Payment Method", "Date", "Supplier",
]];
fmt(sales.getRange("A4:I4"), {
  fill: colors.blue,
  font: { bold: true, color: colors.white, size: 11, typeface: "Montserrat" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
});
sales.getRange("A4:I4").format.rowHeightPx = 28;

const blankSales = Array.from({ length: ROWS }, () => Array(9).fill(null));
sales.getRange(`A${salesStart}:I${salesEnd}`).values = blankSales;
fillFormulas(sales, `F${salesStart}:F${salesEnd}`, `=IF(OR(D${salesStart}="",E${salesStart}=""),"",E${salesStart}-D${salesStart})`);

fmt(sales.getRange(`A${salesStart}:I${salesEnd}`), {
  font: { color: colors.text, size: 10, typeface: "Arial" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
});
fmt(sales.getRange(`D${salesStart}:D${salesEnd}`), { fill: colors.redSoft, horizontalAlignment: "center" });
fmt(sales.getRange(`E${salesStart}:E${salesEnd}`), { fill: colors.blueSoft, horizontalAlignment: "center" });
fmt(sales.getRange(`F${salesStart}:F${salesEnd}`), { fill: colors.greenSoft, horizontalAlignment: "center" });
fmt(sales.getRange(`A${salesStart}:C${salesEnd}`), { fill: colors.white, horizontalAlignment: "center" });
fmt(sales.getRange(`G${salesStart}:I${salesEnd}`), { fill: colors.white, horizontalAlignment: "center" });
sales.getRange(`D${salesStart}:F${salesEnd}`).setNumberFormat("#,##0");
sales.getRange(`H${salesStart}:H${salesEnd}`).setNumberFormat("dd/mm/yyyy");
sales.freezePanes.freezeRows(4);
setCols(sales, [150, 160, 90, 110, 120, 120, 145, 110, 145, 18, 120, 120, 120, 120, 120, 120, 120]);

const salesTable = sales.tables.add(`A4:I${salesEnd}`, true, "SalesTable");
salesTable.style = "TableStyleMedium2";
salesTable.showFilterButton = true;

sales.getRange(`G${salesStart}:G${salesEnd}`).dataValidation = {
  rule: { type: "list", values: ["BaridiMob", "Cash", "Binance", "RedotPay", "Flexy", "CCP", "Banxy", "Other"] },
  ignoreBlanks: true,
  inCellDropDown: true,
};

sales.getRange(`F${salesStart}:F${salesEnd}`).conditionalFormats.add("cellIs", {
  operator: "lessThan",
  formula: 0,
  format: { fill: "#F4CCCC", font: { color: "#990000", bold: true } },
});
sales.getRange(`F${salesStart}:F${salesEnd}`).conditionalFormats.add("cellIs", {
  operator: "greaterThan",
  formula: 0,
  format: { fill: "#D9EAD3", font: { color: "#166534" } },
});

// KPI cards on the right, styled after the reference workbook.
sales.getRange("K1:Q1").values = [["Total Revenue", "Total Cost", "Total Net Profit", "Total Clients", "Meta Ads Cost", "Final Profit After Ads", "20% Profit Share"]];
sales.getRange("K2:Q2").formulas = [[
  `=SUM(E${salesStart}:E${salesEnd})`,
  `=SUM(D${salesStart}:D${salesEnd})`,
  `=SUM(F${salesStart}:F${salesEnd})`,
  `=COUNTA(A${salesStart}:A${salesEnd})`,
  "",
  `=M2-O2`,
  `=P2*20%`,
]];
sales.getRange("O2").values = [[0]];
sales.getRange("K3:Q3").values = [[null, null, null, null, null, null, null]];
const cardFills = [colors.blue, colors.red, colors.green, colors.yellow, colors.orange, "#16A34A", "#7C3AED"];
for (let i = 0; i < 7; i++) {
  const c = col(11 + i);
  fmt(sales.getRange(`${c}1:${c}1`), {
    fill: cardFills[i],
    font: { bold: true, color: i === 3 ? "#1F2937" : colors.white, size: 10, typeface: "Montserrat" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
  });
  fmt(sales.getRange(`${c}2:${c}3`), {
    fill: cardFills[i],
    font: { bold: true, color: i === 3 ? "#1F2937" : colors.white, size: 16, typeface: "Montserrat" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  });
}
sales.getRange("K2:M3").setNumberFormat("#,##0");
sales.getRange("O2:Q3").setNumberFormat("#,##0");
sales.getRange("N2:N3").setNumberFormat("0");
sales.getRange("O2:O3").format = {
  fill: colors.input,
  font: { bold: true, color: "#7C2D12", size: 16, typeface: "Montserrat" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sales.getRange("K1:Q1").format.rowHeightPx = 28;
sales.getRange("K2:Q3").format.rowHeightPx = 34;

sales.getRange("K5:Q8").merge(true);
sales.getRange("K5").values = [[
  "Enter sales in the blank table. Net Profit calculates automatically. Update Meta Ads Cost in the yellow card; Final Profit and 20% Profit Share update instantly.",
]];
fmt(sales.getRange("K5:Q8"), {
  fill: "#EAF1FB",
  font: { color: colors.blueDark, size: 10, typeface: "Arial" },
  wrapText: true,
  verticalAlignment: "center",
});
sales.getRange("K5:Q8").format.rowHeightPx = 26;

// Capital & Wallet Tracking tab
capital.getRange("A1:G2").merge();
capital.getRange("A1").values = [["CAPITAL & WALLET TRACKING"]];
fmt(capital.getRange("A1:G2"), {
  fill: colors.blueDark,
  font: { bold: true, color: colors.white, size: 18, typeface: "Montserrat" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
});
capital.getRange("I1:J1").merge();
capital.getRange("I1").values = [["USD to DZD Rate"]];
capital.getRange("I2:J3").merge();
capital.getRange("I2").values = [[250]];
fmt(capital.getRange("I1:J1"), {
  fill: colors.orange,
  font: { bold: true, color: colors.white, size: 11, typeface: "Montserrat" },
  horizontalAlignment: "center",
});
fmt(capital.getRange("I2:J3"), {
  fill: colors.input,
  font: { bold: true, color: "#7C2D12", size: 16, typeface: "Montserrat" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
});
capital.getRange("I2").setNumberFormat("#,##0");

capital.getRange("A5:G5").values = [[
  "Date", "Cash (DZD)", "BaridiMob", "Binance (USD)", "RedotPay (USD)", "Other Wallets", "Total Portfolio Value",
]];
fmt(capital.getRange("A5:G5"), {
  fill: colors.blue,
  font: { bold: true, color: colors.white, size: 11, typeface: "Montserrat" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
});
capital.getRange("A5:G5").format.rowHeightPx = 32;
capital.getRange(`A${capStart}:G${capEnd}`).values = Array.from({ length: ROWS }, () => Array(7).fill(null));
fillFormulas(capital, `G${capStart}:G${capEnd}`, `=IF(A${capStart}="","",SUM(B${capStart}:C${capStart},F${capStart})+SUM(D${capStart}:E${capStart})*$I$2)`);
fmt(capital.getRange(`A${capStart}:G${capEnd}`), {
  fill: colors.white,
  font: { color: colors.text, size: 10, typeface: "Arial" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
});
fmt(capital.getRange(`B${capStart}:C${capEnd}`), { fill: colors.blueSoft, horizontalAlignment: "center" });
fmt(capital.getRange(`D${capStart}:E${capEnd}`), { fill: colors.greenSoft, horizontalAlignment: "center" });
fmt(capital.getRange(`F${capStart}:F${capEnd}`), { fill: colors.redSoft, horizontalAlignment: "center" });
fmt(capital.getRange(`G${capStart}:G${capEnd}`), { fill: "#D9EAD3", horizontalAlignment: "center" });
capital.getRange(`A${capStart}:A${capEnd}`).setNumberFormat("dd/mm/yyyy");
capital.getRange(`B${capStart}:C${capEnd}`).setNumberFormat("#,##0");
capital.getRange(`D${capStart}:E${capEnd}`).setNumberFormat("$#,##0.00");
capital.getRange(`F${capStart}:G${capEnd}`).setNumberFormat("#,##0");
capital.freezePanes.freezeRows(5);
setCols(capital, [115, 120, 120, 130, 130, 130, 160, 22, 130, 130, 18, 115, 170]);

const capTable = capital.tables.add(`A5:G${capEnd}`, true, "CapitalWalletTable");
capTable.style = "TableStyleMedium2";
capTable.showFilterButton = true;

capital.getRange(`G${capStart}:G${capEnd}`).conditionalFormats.add("dataBar", {
  color: "#00D084",
  gradient: true,
});

capital.getRange("S1:T1").values = [["Date", "Total Portfolio Value"]];
capital.getRange("S2:T32").formulas = Array.from({ length: 31 }, (_, i) => {
  const row = capStart + i;
  return [`=IF($A${row}="","",$A${row})`, `=IF($G${row}="","",$G${row})`];
});
fmt(capital.getRange("S1:T32"), {
  fill: "#F0F4FA",
  font: { color: colors.text, size: 9, typeface: "Arial" },
  horizontalAlignment: "center",
});
fmt(capital.getRange("S1:T1"), {
  fill: colors.blue,
  font: { bold: true, color: colors.white, size: 10, typeface: "Montserrat" },
  horizontalAlignment: "center",
});
capital.getRange("S2:S32").setNumberFormat("dd/mm");
capital.getRange("T2:T32").setNumberFormat("#,##0");

const chart = capital.charts.add("line", capital.getRange("S1:T32"));
chart.title = "Portfolio Growth Over Time";
chart.hasLegend = false;
chart.xAxis = { axisType: "textAxis" };
chart.yAxis = { numberFormatCode: "#,##0" };
chart.setPosition("I5", "Q22");

capital.getRange("I24:Q27").merge();
capital.getRange("I24").values = [[
  "Add one row per day. Cash, BaridiMob, and Other Wallets are treated as DZD. Binance and RedotPay are converted using the editable USD to DZD rate above. The chart uses the first 31 visible daily rows for the current month.",
]];
fmt(capital.getRange("I24:Q27"), {
  fill: "#EAF1FB",
  font: { color: colors.blueDark, size: 10, typeface: "Arial" },
  wrapText: true,
  verticalAlignment: "center",
});
capital.getRange("I24:Q27").format.rowHeightPx = 26;

// Compact visual borders via table style and strong fills; set row heights for editable areas.
sales.getRange(`A${salesStart}:I${Math.min(salesEnd, 45)}`).format.rowHeightPx = 23;
capital.getRange(`A${capStart}:G${Math.min(capEnd, 45)}`).format.rowHeightPx = 23;

// Verification previews
await fs.mkdir(outputDir, { recursive: true });
for (const [sheetName, range, filename] of [
  ["Sales Dashboard", "A1:Q28", "sales-dashboard-preview.png"],
  ["Capital & Wallet Tracking", "A1:Q30", "capital-wallet-preview.png"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/${filename}`, new Uint8Array(await preview.arrayBuffer()));
}

const salesCheck = await workbook.inspect({
  kind: "table",
  range: "Sales Dashboard!A1:Q12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 17,
});
console.log(salesCheck.ndjson);

const capCheck = await workbook.inspect({
  kind: "table",
  range: "Capital & Wallet Tracking!A1:M14",
  include: "values,formulas",
  tableMaxRows: 14,
  tableMaxCols: 13,
});
console.log(capCheck.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(`SAVED ${outputPath}`);
