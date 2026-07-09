import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/Achraff/Desktop/June_2026_Upgraded.xlsx";
const outputDir = "C:/Users/Achraff/Desktop/Tiger store/site/outputs/sales-dashboard-build";

const blob = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(blob);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table,drawing",
  maxChars: 7000,
  tableMaxRows: 8,
  tableMaxCols: 10,
});
console.log(summary.ndjson);

const sheets = JSON.parse(`[${(await workbook.inspect({ kind: "sheet", include: "id,name" })).ndjson.trim().split("\n").join(",")}]`);
for (const sheet of sheets) {
  const name = sheet.name;
  const safeName = name.replace(/[\\/:*?"<>|]/g, "_");
  const preview = await workbook.render({ sheetName: name, range: "A1:X29", scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/reference-${safeName}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const style = await workbook.inspect({
  kind: "computedStyle",
  range: "A1:Q30",
  maxChars: 8000,
});
console.log(style.ndjson);
