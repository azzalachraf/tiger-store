import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getWarrantyLinkSecret, getWarrantyLinkSecrets } from "@/lib/env";

export type ProductCheckoutLinkPayload = {
  slug: string;
  optionId: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
};

const LINK_VERSION = "p1";
const EXPIRY_DAYS = 90;

function sign(value: string) {
  return createHmac("sha256", getWarrantyLinkSecret()).update(value).digest().subarray(0, 16).toString("base64url");
}

function hasValidSignature(value: string, signature: string) {
  const received = Buffer.from(signature);
  return getWarrantyLinkSecrets().some((secret) => {
    const expected = createHmac("sha256", secret).update(value).digest().subarray(0, 16).toString("base64url");
    const expectedBuffer = Buffer.from(expected);
    return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
  });
}

function isSafeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isSafeOptionId(value: string) {
  return /^[A-Za-z0-9:_-]{1,160}$/.test(value);
}

export function createProductCheckoutLink(input: Pick<ProductCheckoutLinkPayload, "slug" | "optionId">) {
  if (!isSafeSlug(input.slug) || !isSafeOptionId(input.optionId)) throw new Error("Invalid product link input.");
  const issuedMinutes = Math.floor(Date.now() / 60_000).toString(36);
  const nonce = randomBytes(6).toString("base64url");
  const unsigned = [LINK_VERSION, input.slug, input.optionId, issuedMinutes, nonce].join(".");
  return `${unsigned}.${sign(unsigned)}`;
}

export function verifyProductCheckoutLink(token: string): ProductCheckoutLinkPayload | undefined {
  if (token.length > 512) return undefined;
  const parts = token.split(".");
  if (parts.length !== 6 || parts[0] !== LINK_VERSION) return undefined;
  const [version, slug, optionId, issuedMinutes, nonce, signature] = parts;
  const unsigned = [version, slug, optionId, issuedMinutes, nonce].join(".");
  if (!hasValidSignature(unsigned, signature)) return undefined;
  const minutes = Number.parseInt(issuedMinutes, 36);
  if (!isSafeSlug(slug) || !isSafeOptionId(optionId) || !Number.isSafeInteger(minutes) || minutes < 0 || !/^[A-Za-z0-9_-]{8}$/.test(nonce)) return undefined;
  const issuedAt = new Date(minutes * 60_000);
  const expiresAt = new Date(issuedAt);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + EXPIRY_DAYS);
  if (expiresAt.getTime() < Date.now()) return undefined;
  return { slug, optionId, issuedAt: issuedAt.toISOString(), expiresAt: expiresAt.toISOString(), nonce };
}
