import assert from "node:assert/strict";
import { telegramWarrantyFormSchema } from "../lib/validation";

const base = { name: "Test Customer", username: "testuser", platform: "Snapchat", phone: "+213550123456", email: "client@example.com" };
assert.equal(telegramWarrantyFormSchema.safeParse(base).success, false, "Payment method must be required.");
assert.equal(telegramWarrantyFormSchema.safeParse({ ...base, paymentMethod: "Flexy" }).success, true, "A supported payment method must be accepted.");
assert.equal(telegramWarrantyFormSchema.safeParse({ ...base, paymentMethod: "Cash" }).success, false, "Unsupported methods must be rejected.");
assert.equal(telegramWarrantyFormSchema.safeParse({ ...base, email: "", paymentMethod: "Flexy" }).success, false, "Email must be required.");
console.log("Warranty payment method validation passed.");
