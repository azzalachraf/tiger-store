import assert from "node:assert/strict";
import { telegramWarrantyFormSchema } from "../lib/validation";

const base = { name: "Test Customer", username: "testuser", platform: "Snapchat", phone: "+213550123456" };
assert.equal(telegramWarrantyFormSchema.safeParse(base).success, false, "Payment method must be required.");
assert.equal(telegramWarrantyFormSchema.safeParse({ ...base, paymentMethod: "Flexy" }).success, true, "A supported payment method must be accepted.");
assert.equal(telegramWarrantyFormSchema.safeParse({ ...base, paymentMethod: "Cash" }).success, false, "Unsupported methods must be rejected.");
for (const field of ["name", "username", "platform", "phone", "paymentMethod"] as const) {
  assert.equal(telegramWarrantyFormSchema.safeParse({ ...base, paymentMethod: "Flexy", [field]: "" }).success, false, `${field} must be required.`);
}
console.log("Warranty payment method validation passed.");
