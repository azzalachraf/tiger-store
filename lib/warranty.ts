import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getWarrantyLinkSecret } from "@/lib/env";

type WarrantyPayloadBase = {
  version: 1;
  coveredDays: number;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
};

export type WarrantyOrderLinkPayload = WarrantyPayloadBase & {
  source?: "order";
  orderId: string;
  itemIndex: number;
};

export type WarrantyDirectLinkPayload = WarrantyPayloadBase & {
  source: "direct";
  slug: string;
  optionId: string;
  amountPaid: number;
  paymentMethod: "BaridiMob" | "Binance" | "RedotPay";
};

export type WarrantyLinkPayload = WarrantyOrderLinkPayload | WarrantyDirectLinkPayload;

type WarrantyClaimCookie = {
  nonce: string;
  recipientName: string;
  expiresAt: string;
};

function sign(encodedPayload: string) {
  return createHmac("sha256", getWarrantyLinkSecret()).update(encodedPayload).digest("base64url");
}

function expirationDates() {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  // The submission link is deliberately long-lived, while still bounded in case it is shared accidentally.
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 2);
  return { issuedAt: issuedAt.toISOString(), expiresAt: expiresAt.toISOString() };
}

function encodePayload(payload: WarrantyLinkPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function createWarrantyLink(input: Pick<WarrantyOrderLinkPayload, "orderId" | "itemIndex" | "coveredDays">) {
  const payload: WarrantyOrderLinkPayload = {
    version: 1,
    ...input,
    ...expirationDates(),
    nonce: randomBytes(18).toString("base64url"),
  };
  return encodePayload(payload);
}

export function createDirectWarrantyLink(input: Pick<WarrantyDirectLinkPayload, "slug" | "optionId" | "coveredDays" | "amountPaid" | "paymentMethod">) {
  const payload: WarrantyDirectLinkPayload = {
    version: 1,
    source: "direct",
    ...input,
    ...expirationDates(),
    nonce: randomBytes(18).toString("base64url"),
  };
  return encodePayload(payload);
}

export function verifyWarrantyLink(token: string): WarrantyLinkPayload | undefined {
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra || token.length > 1600) return undefined;
  const expected = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return undefined;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as WarrantyLinkPayload;
    const hasValidBase =
      payload.version === 1 &&
      Number.isInteger(payload.coveredDays) && payload.coveredDays >= 1 && payload.coveredDays <= 3650 &&
      /^[A-Za-z0-9_-]{20,40}$/.test(payload.nonce) &&
      !Number.isNaN(Date.parse(payload.issuedAt)) &&
      !Number.isNaN(Date.parse(payload.expiresAt)) &&
      Date.parse(payload.expiresAt) >= Date.now();
    if (!hasValidBase) return undefined;
    if (payload.source === "direct") {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug) || !/^[A-Za-z0-9:_-]{1,160}$/.test(payload.optionId) || !Number.isInteger(payload.amountPaid) || payload.amountPaid < 1 || payload.amountPaid > 10_000_000 || !["BaridiMob", "Binance", "RedotPay"].includes(payload.paymentMethod)) return undefined;
      return payload;
    }
    if (
      !/^[A-Za-z0-9-]{1,160}$/.test(payload.orderId) ||
      !Number.isInteger(payload.itemIndex) || payload.itemIndex < 0 || payload.itemIndex > 19 ||
      payload.source !== undefined && payload.source !== "order"
    ) return undefined;
    return payload;
  } catch {
    return undefined;
  }
}

export function warrantyCertificateCode(payload: WarrantyLinkPayload) {
  return `TW-${payload.nonce.slice(0, 10).toUpperCase()}`;
}

export function directWarrantyOrderId(payload: WarrantyDirectLinkPayload) {
  return `TS-W-${payload.nonce.slice(0, 10).toUpperCase()}`;
}

export function warrantyEndDate(payload: WarrantyLinkPayload) {
  const end = new Date(payload.issuedAt);
  end.setUTCDate(end.getUTCDate() + payload.coveredDays);
  return end;
}

export function warrantyClaimCookieName(token: string) {
  return `tiger_warranty_${createHmac("sha256", getWarrantyLinkSecret()).update(token).digest("hex").slice(0, 24)}`;
}

export function createWarrantyClaimCookie(payload: WarrantyLinkPayload, recipientName: string) {
  const claim: WarrantyClaimCookie = {
    nonce: payload.nonce,
    recipientName,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const encoded = Buffer.from(JSON.stringify(claim)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyWarrantyClaimCookie(payload: WarrantyLinkPayload, value: string | undefined) {
  if (!value) return undefined;
  const [encoded, signature, extra] = value.split(".");
  if (!encoded || !signature || extra) return undefined;
  const expected = sign(encoded);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return undefined;
  try {
    const claim = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as WarrantyClaimCookie;
    if (claim.nonce !== payload.nonce || typeof claim.recipientName !== "string" || claim.recipientName.trim().length < 2 || claim.recipientName.length > 160 || Number.isNaN(Date.parse(claim.expiresAt)) || Date.parse(claim.expiresAt) < Date.now()) return undefined;
    return claim.recipientName;
  } catch {
    return undefined;
  }
}
