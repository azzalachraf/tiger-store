import { strict as assert } from "node:assert";
import { parseRedeemCardsSheet } from "@/lib/redeem-sheet-parser";

const cards = parseRedeemCardsSheet([
  ["Tiger Store — Redeem Cards 2"],
  ["Owner instructions"],
  [],
  ["24 TRY", "", "100 INR", ""],
  ["Code", "Status", "Code", "Status"],
  ["try-card-1", "TRUE", "inr-card-1", "FALSE"],
  ["Paste code here (replace this sample row)", "TRUE", "", ""],
]);

assert.deepEqual(cards, [
  { code: "try-card-1", cardType: "try_24", sourceRowKey: "1:6", available: true },
  { code: "inr-card-1", cardType: "inr_100", sourceRowKey: "3:6", available: false },
]);
console.log("redeem-sheet header discovery and sample-row filtering passed");
