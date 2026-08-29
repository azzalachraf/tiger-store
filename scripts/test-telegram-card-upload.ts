import { strict as assert } from "node:assert";
import { parseTelegramRedeemCardLines } from "../lib/telegram-card-upload";

const parsed = parseTelegramRedeemCardLines("try_24", "CODE-ONE\nCODE-TWO");
assert.deepEqual(parsed, ["CODE-ONE", "CODE-TWO"]);
assert.deepEqual(
  parseTelegramRedeemCardLines("try_24", "https://apps.apple.com/redeem?code=TEST-CODE-123"),
  ["TEST-CODE-123"],
);
assert.deepEqual(
  parseTelegramRedeemCardLines("try_24", "https://apps.apple.com/redeem/?code=TEST-CODE-456"),
  ["TEST-CODE-456"],
);

assert.throws(() => parseTelegramRedeemCardLines("try_24", "CODE-ONE\nCODE-ONE"));
assert.throws(() => parseTelegramRedeemCardLines("try_24", ""));
assert.throws(() => parseTelegramRedeemCardLines("try_24", "/upload try_24"));
assert.throws(() => parseTelegramRedeemCardLines("try_24", "https://example.com/redeem?code=TEST-CODE-123"));

console.log("Telegram card-upload parsing passed.");
