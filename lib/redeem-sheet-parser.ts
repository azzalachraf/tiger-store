import type { SnapchatCardType } from "@/lib/snapchat-card-mapping";
import { sheetCardType } from "@/lib/snapchat-card-mapping";

export type SheetRedeemCode = { code: string; cardType: SnapchatCardType; sourceRowKey: string; available: boolean };
type RedeemColumn = { codeColumn: number; statusColumn: number; cardType: SnapchatCardType; firstCodeRow: number };

function cell(row: unknown[] | undefined, index: number) {
  const value = row?.[index];
  return typeof value === "string" ? value.trim() : value === true ? "TRUE" : value === false ? "FALSE" : "";
}

export function parseRedeemCardsSheet(rows: unknown[][]): SheetRedeemCode[] {
  if (rows.length < 3) return [];
  const columns: RedeemColumn[] = [];
  const headingSearchRows = Math.min(rows.length - 1, 10);
  for (let headingRow = 0; headingRow < headingSearchRows; headingRow += 1) {
    for (let column = 0; column < (rows[headingRow]?.length ?? 0); column += 1) {
      const type = sheetCardType(cell(rows[headingRow], column));
      if (!type || cell(rows[headingRow + 1], column).toLowerCase() !== "code" || cell(rows[headingRow + 1], column + 1).toLowerCase() !== "status") continue;
      columns.push({ codeColumn: column, statusColumn: column + 1, cardType: type, firstCodeRow: headingRow + 2 });
    }
  }
  const seen = new Set<string>();
  const cards: SheetRedeemCode[] = [];
  for (const column of columns) {
    for (let rowIndex = column.firstCodeRow; rowIndex < rows.length; rowIndex += 1) {
      const code = cell(rows[rowIndex], column.codeColumn);
      if (!code || code.toLowerCase().startsWith("paste code here")) continue;
      const unique = `${column.cardType}:${code}`;
      if (seen.has(unique)) continue;
      seen.add(unique);
      cards.push({ code, cardType: column.cardType, sourceRowKey: `${column.codeColumn + 1}:${rowIndex + 1}`, available: cell(rows[rowIndex], column.statusColumn).toUpperCase() === "TRUE" });
    }
  }
  return cards;
}
