export const ADMIN_FRAUD_THRESHOLDS = {
  rapidClaims: 3,
  cancellations24h: 3,
  unfinishedClaims: 3,
} as const;

export type AdminFraudReason =
  | "rapid_claims"
  | "frequent_cancellations"
  | "unfinished_claims";

export function canViewPrivateCardCodes(role: "owner" | "admin" | "pending") {
  return role === "owner";
}

export function adminFraudReasons(input: {
  rapidClaims: number;
  cancellations24h: number;
  unfinishedClaims: number;
}): AdminFraudReason[] {
  const reasons: AdminFraudReason[] = [];
  if (input.rapidClaims >= ADMIN_FRAUD_THRESHOLDS.rapidClaims) {
    reasons.push("rapid_claims");
  }
  if (input.cancellations24h >= ADMIN_FRAUD_THRESHOLDS.cancellations24h) {
    reasons.push("frequent_cancellations");
  }
  if (input.unfinishedClaims >= ADMIN_FRAUD_THRESHOLDS.unfinishedClaims) {
    reasons.push("unfinished_claims");
  }
  return reasons;
}
