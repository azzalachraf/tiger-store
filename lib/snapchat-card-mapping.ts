export const snapchatCardTypes = ["try_24", "try_48", "inr_100", "try_115", "try_229", "inr_199", "inr_298"] as const;
export type SnapchatCardType = (typeof snapchatCardTypes)[number];
export const snapchatPlans = [1, 2, 3, 6, 12] as const;
export type SnapchatPlanMonths = (typeof snapchatPlans)[number];

const allowedCards: Record<SnapchatPlanMonths, readonly SnapchatCardType[]> = {
  1: ["try_24", "try_48"], 2: ["inr_100"], 3: ["try_115"], 6: ["try_229"], 12: ["inr_199", "inr_298"],
};
const labels: Record<SnapchatCardType, { ar: string; en: string }> = {
  try_24: { ar: "24 TRY", en: "24 TRY" }, try_48: { ar: "48 TRY", en: "48 TRY" },
  inr_100: { ar: "100 INR", en: "100 INR" }, try_115: { ar: "115 TRY", en: "115 TRY" },
  try_229: { ar: "229 TRY", en: "229 TRY" }, inr_199: { ar: "199 INR", en: "199 INR" }, inr_298: { ar: "298 INR", en: "298 INR" },
};
export function isSnapchatPlan(value: number): value is SnapchatPlanMonths { return snapchatPlans.includes(value as SnapchatPlanMonths); }
export function isSnapchatCardType(value: string): value is SnapchatCardType { return snapchatCardTypes.includes(value as SnapchatCardType); }
export function cardsForPlan(plan: SnapchatPlanMonths) { return allowedCards[plan]; }
export function cardLabel(type: SnapchatCardType, locale: "ar" | "en") { return labels[type][locale]; }
export function sheetCardType(label: string): SnapchatCardType | null {
  const normalized = label.trim().toUpperCase().replace(/\s+/g, " ");
  const map: Record<string, SnapchatCardType> = { "24 TRY": "try_24", "48 TRY": "try_48", "100 INR": "inr_100", "115 TRY": "try_115", "229 TRY": "try_229", "199 INR": "inr_199", "298 INR": "inr_298" };
  return map[normalized] ?? null;
}
