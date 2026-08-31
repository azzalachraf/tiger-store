import assert from "node:assert/strict";
import { resolveTrafficRange } from "../lib/traffic-range";

const now = new Date("2026-08-31T14:00:00+01:00");
assert.deepEqual(resolveTrafficRange({ range: "today" }, now).start, "2026-08-31");
assert.deepEqual(resolveTrafficRange({ range: "7d" }, now).start, "2026-08-25");
assert.deepEqual(resolveTrafficRange({ range: "30d" }, now).start, "2026-08-02");
const custom = resolveTrafficRange({ range: "custom", start: "2026-08-10", end: "2026-08-15" }, now);
assert.equal(custom.start, "2026-08-10");
assert.equal(custom.endExclusiveIso, "2026-08-16T00:00:00+01:00");
assert.equal(resolveTrafficRange({ range: "custom", start: "2026-08-20", end: "2026-08-10" }, now).key, "today");
console.log("traffic date-range checks passed");
