export type TrafficRangeKey = "today" | "7d" | "30d" | "custom";
export type TrafficDateRange = { key: TrafficRangeKey; start: string; end: string; startIso: string; endExclusiveIso: string; label: string };

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function algeriaDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Algiers", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function daysBefore(day: string, days: number) {
  const date = new Date(`${day}T12:00:00+01:00`);
  date.setUTCDate(date.getUTCDate() - days);
  return algeriaDate(date);
}

function nextDay(day: string) {
  const date = new Date(`${day}T12:00:00+01:00`);
  date.setUTCDate(date.getUTCDate() + 1);
  return algeriaDate(date);
}

function buildRange(key: TrafficRangeKey, start: string, end: string, label: string): TrafficDateRange {
  return { key, start, end, startIso: `${start}T00:00:00+01:00`, endExclusiveIso: `${nextDay(end)}T00:00:00+01:00`, label };
}

export function resolveTrafficRange(input: { range?: string; start?: string; end?: string }, now = new Date()): TrafficDateRange {
  const today = algeriaDate(now);
  if (input.range === "7d") return buildRange("7d", daysBefore(today, 6), today, "Last 7 days");
  if (input.range === "30d") return buildRange("30d", daysBefore(today, 29), today, "Last 30 days");
  if (input.range === "custom" && input.start && input.end && datePattern.test(input.start) && datePattern.test(input.end) && input.start <= input.end && input.end <= today) {
    return buildRange("custom", input.start, input.end, "Custom range");
  }
  return buildRange("today", today, today, "Today");
}
