import { strict as assert } from "node:assert";
import { telegramWarrantyFormSchema } from "../lib/validation";

const flexyGrossByMonths: Record<number, number> = { 1: 750, 2: 1000, 3: 1900, 6: 2400, 12: 2800 };

for (const [months, gross] of Object.entries(flexyGrossByMonths)) {
  assert.equal(Math.floor(gross * 85 / 100), ({ 1: 637, 2: 850, 3: 1615, 6: 2040, 12: 2380 } as Record<number, number>)[Number(months)]);
}

assert.equal(600 - 135 - 0, 465, "Salary-admin sales must not subtract a commission.");
assert.equal(600 - 135 - 100, 365, "Commission-admin sales keep their saved commission.");

const requiredWarrantyFields = { name: "Client name", username: "client_name", platform: "Snapchat", phone: "+213555000000", paymentMethod: "Flexy" };
assert.equal(telegramWarrantyFormSchema.parse({ ...requiredWarrantyFields, email: "" }).email, undefined);
assert.throws(() => telegramWarrantyFormSchema.parse({ ...requiredWarrantyFields, username: "" }));
assert.throws(() => telegramWarrantyFormSchema.parse({ ...requiredWarrantyFields, platform: "" }));
assert.throws(() => telegramWarrantyFormSchema.parse({ ...requiredWarrantyFields, paymentMethod: "" }));

console.log("Tiger New Sheet Flexy and warranty form validation passed.");
