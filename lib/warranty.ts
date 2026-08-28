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

function signCompact(value: string) {
  return createHmac("sha256", getWarrantyLinkSecret()).update(value).digest().subarray(0, 16).toString("base64url");
}

function compactNonce() {
  return randomBytes(6).toString("base64url");
}

function paymentCode(paymentMethod: WarrantyDirectLinkPayload["paymentMethod"]) {
  return paymentMethod === "BaridiMob" ? "b" : paymentMethod === "Binance" ? "n" : "r";
}

function paymentFromCode(value: string): WarrantyDirectLinkPayload["paymentMethod"] | undefined {
  return value === "b" ? "BaridiMob" : value === "n" ? "Binance" : value === "r" ? "RedotPay" : undefined;
}

function encodeCompact(fields: string[]) {
  const unsigned = ["2", ...fields].join(".");
  return `${unsigned}.${signCompact(unsigned)}`;
}

export function createWarrantyLink(input: Pick<WarrantyOrderLinkPayload, "orderId" | "itemIndex" | "coveredDays">) {
  return encodeCompact(["o", input.orderId, input.itemIndex.toString(36), input.coveredDays.toString(36), Math.floor(Date.now() / 60_000).toString(36), compactNonce()]);
}

export function createDirectWarrantyLink(input: Pick<WarrantyDirectLinkPayload, "slug" | "optionId" | "coveredDays" | "amountPaid" | "paymentMethod">) {
  return encodeCompact(["d", input.slug, input.optionId, input.amountPaid.toString(36), paymentCode(input.paymentMethod), input.coveredDays.toString(36), Math.floor(Date.now() / 60_000).toString(36), compactNonce()]);
}

function validCompactNonce(value: string) {
  return /^[A-Za-z0-9_-]{8}$/.test(value);
}

function issuedDatesFromMinutes(value: string) {
  const minutes = Number.parseInt(value, 36);
  if (!Number.isSafeInteger(minutes) || minutes < 0) return undefined;
  const issuedAt = new Date(minutes * 60_000);
  const expiresAt = new Date(issuedAt);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 2);
  if (expiresAt.getTime() < Date.now()) return undefined;
  return { issuedAt: issuedAt.toISOString(), expiresAt: expiresAt.toISOString() };
}

function parseCompactWarrantyLink(token: string): WarrantyLinkPayload | undefined {
  if (token.length > 512) return undefined;
  const parts = token.split(".");
  if (parts[0] !== "2" || parts.length < 8) return undefined;
  const signature = parts.at(-1);
  const unsigned = parts.slice(0, -1).join(".");
  if (!signature || signature.length !== 22) return undefined;
  const expected = signCompact(unsigned);
  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (received.length !== expectedBuffer.length || !timingSafeEqual(received, expectedBuffer)) return undefined;
  const source = parts[1];
  if (source === "o" && parts.length === 8) {
    const [, , orderId, itemIndex, coveredDays, issuedMinutes, nonce] = parts;
    const dates = issuedDatesFromMinutes(issuedMinutes);
    const index = Number.parseInt(itemIndex, 36);
    const days = Number.parseInt(coveredDays, 36);
    if (!dates || !/^[A-Za-z0-9-]{1,160}$/.test(orderId) || !Number.isInteger(index) || index < 0 || index > 19 || !Number.isInteger(days) || days < 1 || days > 3650 || !validCompactNonce(nonce)) return undefined;
    return { version: 1, orderId, itemIndex: index, coveredDays: days, nonce, ...dates };
  }
  if (source === "d" && parts.length === 10) {
    const [, , slug, optionId, amountPaid, payment, coveredDays, issuedMinutes, nonce] = parts;
    const dates = issuedDatesFromMinutes(issuedMinutes);
    const amount = Number.parseInt(amountPaid, 36);
    const days = Number.parseInt(coveredDays, 36);
    const paymentMethod = paymentFromCode(payment);
    if (!dates || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[A-Za-z0-9:_-]{1,160}$/.test(optionId) || !Number.isInteger(amount) || amount < 1 || amount > 10_000_000 || !paymentMethod || !Number.isInteger(days) || days < 1 || days > 3650 || !validCompactNonce(nonce)) return undefined;
    return { version: 1, source: "direct", slug, optionId, amountPaid: amount, paymentMethod, coveredDays: days, nonce, ...dates };
  }
  return undefined;
}

export function verifyWarrantyLink(token: string): WarrantyLinkPayload | undefined {
  if (token.startsWith("2.")) return parseCompactWarrantyLink(token);
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
