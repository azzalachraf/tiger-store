import { strict as assert } from "node:assert";
import { parseTelegramRedeemCardUpload } from "../lib/telegram-card-upload";

const parsed = parseTelegramRedeemCardUpload("/upload try_24\nCODE-ONE\nCODE-TWO");
assert.equal(parsed.cardType, "try_24");
assert.deepEqual(parsed.codes, ["CODE-ONE", "CODE-TWO"]);

assert.throws(() => parseTelegramRedeemCardUpload("/upload try_24\nCODE-ONE\nCODE-ONE"));
assert.throws(() => parseTelegramRedeemCardUpload("/upload try_24 CODE-ONE"));
assert.throws(() => parseTelegramRedeemCardUpload("/upload invalid\nCODE-ONE"));

console.log("Telegram card-upload parsing passed.");
