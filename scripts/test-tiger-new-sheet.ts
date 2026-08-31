import { strict as assert } from "node:assert";

const flexyGrossByMonths: Record<number, number> = { 1: 750, 2: 1000, 3: 1900, 6: 2400, 12: 2800 };

for (const [months, gross] of Object.entries(flexyGrossByMonths)) {
  assert.equal(Math.floor(gross * 85 / 100), ({ 1: 637, 2: 850, 3: 1615, 6: 2040, 12: 2380 } as Record<number, number>)[Number(months)]);
}

console.log("Tiger New Sheet Flexy calculation passed.");
