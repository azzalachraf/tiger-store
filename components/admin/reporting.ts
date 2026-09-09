import { localDay, periodStart } from "./data-tools";
export type ReportQuery = { range?: string; start?: string; end?: string };
export function reportRange(query: ReportQuery, now = new Date()) {
  const range = ["today", "7", "30", "month", "all", "custom"].includes(
    query.range ?? "",
  )
    ? query.range!
    : "month";
  const today = localDay(now);
  const valid = (v?: string) =>
    Boolean(
      v &&
        /^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(v + "T12:00:00Z")) &&
        new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v &&
        v <= today,
    );
  if (range === "custom") {
    if (valid(query.start) && valid(query.end) && query.start! <= query.end!)
      return { range, start: query.start!, end: query.end!, invalid: false };
    return {
      range,
      start: periodStart("month", now),
      end: today,
      invalid: true,
    };
  }
  return { range, start: periodStart(range, now), end: today, invalid: false };
}
