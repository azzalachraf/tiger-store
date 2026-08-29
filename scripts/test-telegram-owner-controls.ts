import { strict as assert } from "node:assert";
import { telegramCallbackDataSchema } from "../lib/validation";

assert.equal(telegramCallbackDataSchema.safeParse(["own", "admins"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["apr", "8915644277"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["adm", "8915644277", "adjust"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["adj", "8915644277", "m50"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["pay", "8915644277", "full"]).success, true);
assert.equal(telegramCallbackDataSchema.safeParse(["adj", "invalid", "p50"]).success, false);
assert.equal(telegramCallbackDataSchema.safeParse(["pay", "8915644277", "10000"]).success, false);

console.log("Telegram owner-control callback validation passed.");
