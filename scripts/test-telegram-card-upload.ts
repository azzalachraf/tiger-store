import { strict as assert } from "node:assert";
import { parseTelegramRedeemCardLines } from "../lib/telegram-card-upload";

const parsed = parseTelegramRedeemCardLines("try_24", "CODE-ONE\nCODE-TWO");
assert.deepEqual(parsed, ["CODE-ONE", "CODE-TWO"]);

assert.throws(() => parseTelegramRedeemCardLines("try_24", "CODE-ONE\nCODE-ONE"));
assert.throws(() => parseTelegramRedeemCardLines("try_24", ""));
assert.throws(() => parseTelegramRedeemCardLines("try_24", "/upload try_24"));

console.log("Telegram card-upload parsing passed.");
