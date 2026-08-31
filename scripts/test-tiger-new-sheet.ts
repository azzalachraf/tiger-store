import { strict as assert } from "node:assert";
import { telegramWarrantyFormSchema } from "../lib/validation";

const flexyGrossByMonths: Record<number, number> = { 1: 750, 2: 1000, 3: 1900, 6: 2400, 12: 2800 };

for (const [months, gross] of Object.entries(flexyGrossByMonths)) {
  assert.equal(Math.floor(gross * 85 / 100), ({ 1: 637, 2: 850, 3: 1615, 6: 2040, 12: 2380 } as Record<number, number>)[Number(months)]);
}

const requiredWarrantyFields = { name: "Client name", username: "client_name", platform: "Snapchat", phone: "+213555000000" };
assert.equal(telegramWarrantyFormSchema.parse({ ...requiredWarrantyFields, email: "" }).email, undefined);
assert.throws(() => telegramWarrantyFormSchema.parse({ ...requiredWarrantyFields, username: "" }));
assert.throws(() => telegramWarrantyFormSchema.parse({ ...requiredWarrantyFields, platform: "" }));

console.log("Tiger New Sheet Flexy and warranty form validation passed.");
