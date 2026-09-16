import { strict as assert } from "node:assert";
import { telegramCallbackDataSchema } from "../lib/validation";
import { adminFraudReasons, canViewPrivateCardCodes } from "../lib/admin-fraud-alerts";

assert.equal(telegramCallbackDataSchema.safeParse(["own", "admins"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["own", "upload"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["own", "stock"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["own", "orders"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["own", "external"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["cs", "try_24"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["cc", "try_24", "confirm"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["cv", "try_24"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["ru", "b964657e-9b61-4e05-b787-b902a2fa1a7c"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["sv"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["ops", "orders"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["ops", "external"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["ops", "stock"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["wo", "TS-123456"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["wi", "TS-123456", "0"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["wc", "TS-123456", "0", 12, "inr_199"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["wp", "b964657e-9b61-4e05-b787-b902a2fa1a7c", "TS-123456", "0", "complete"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["ex", 3]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["ex", 3, "confirm"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["wi", "TS-123456", "100"]).success, false);
assert.equal(telegramCallbackDataSchema.safeParse(["an", "today"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["an", "yesterday"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["an", "7d"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["an", "30d"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["an", "month"]).success, false);
assert.equal(telegramCallbackDataSchema.safeParse(["apr", "8915644277"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["adm", "8915644277", "adjust"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["adm", "8915644277", "compensation"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["adm", "8915644277", "gender"]).success, false);
assert.equal(telegramCallbackDataSchema.safeParse(["apg", "8915644277", "male"]).success, false);
assert.equal(telegramCallbackDataSchema.safeParse(["cmp", "8915644277", "salary", "0"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["cmp", "8915644277", "commission", "150"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["cmp", "8915644277", "custom", "0"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["adj", "8915644277", "m50"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["pay", "8915644277", "full"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["adj", "invalid", "p50"]).success, false);
assert.equal(telegramCallbackDataSchema.safeParse(["pay", "8915644277", "10000"]).success, false);
assert.equal(telegramCallbackDataSchema.safeParse(["cc", "try_24", "delete"]).success, false);

assert.deepEqual(
  adminFraudReasons({ rapidClaims: 2, cancellations24h: 2, unfinishedClaims: 2 }),
  [],
);
assert.deepEqual(
  adminFraudReasons({ rapidClaims: 3, cancellations24h: 3, unfinishedClaims: 3 }),
  ["rapid_claims", "frequent_cancellations", "unfinished_claims"],
);
assert.equal(canViewPrivateCardCodes("owner"), true);
assert.equal(canViewPrivateCardCodes("admin"), false);
assert.equal(canViewPrivateCardCodes("pending"), false);

console.log("Telegram owner-control callback validation passed.");
