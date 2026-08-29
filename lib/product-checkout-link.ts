import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getWarrantyLinkSecret, getWarrantyLinkSecrets } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";

export type ProductCheckoutLinkPayload = {
  slug: string;
  optionId: string;
  issuedAt: string;
  nonce: string;
};

type StoredProductCheckoutLink = { product_slug: string; option_id: string; created_at: string };

const LINK_VERSION = "p1";

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

/** Extract the public catalog target carried by a product checkout URL. */
export function readProductCheckoutLinkTarget(token: string): Pick<ProductCheckoutLinkPayload, "slug" | "optionId"> | undefined {
  const parts = token.split(".");
  if (token.length > 512 || parts.length !== 6 || parts[0] !== LINK_VERSION) return undefined;
  const [, slug, optionId] = parts;
  if (!isSafeSlug(slug) || !isSafeOptionId(optionId)) return undefined;
  return { slug, optionId };
}

function createLegacyProductCheckoutLink(input: Pick<ProductCheckoutLinkPayload, "slug" | "optionId">) {
  if (!isSafeSlug(input.slug) || !isSafeOptionId(input.optionId)) throw new Error("Invalid product link input.");
  const issuedMinutes = Math.floor(Date.now() / 60_000).toString(36);
  const nonce = randomBytes(6).toString("base64url");
  const unsigned = [LINK_VERSION, input.slug, input.optionId, issuedMinutes, nonce].join(".");
  return `${unsigned}.${sign(unsigned)}`;
}

/**
 * Create a compact, server-stored payment-link token. Its destination is still
 * checked against the live catalog when opened, so edited prices or stock are
 * never trusted from a URL.
 */
export async function createProductCheckoutLink(input: Pick<ProductCheckoutLinkPayload, "slug" | "optionId">) {
  if (!isSafeSlug(input.slug) || !isSafeOptionId(input.optionId)) throw new Error("Invalid product link input.");
  const client = getSupabaseServiceClient();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = randomBytes(9).toString("base64url");
    const { error } = await client.from("product_checkout_links").insert({ token, product_slug: input.slug, option_id: input.optionId });
    if (!error) return token;
    if (error.code !== "23505") throw new Error("Product payment links are unavailable until the required migration is applied.");
  }
  // Practically unreachable; retain the signed format rather than generating
  // a link that cannot resolve if a token collision repeatedly occurs.
  return createLegacyProductCheckoutLink(input);
}

export function verifyProductCheckoutLink(token: string): ProductCheckoutLinkPayload | undefined {
  const parts = token.split(".");
  const target = readProductCheckoutLinkTarget(token);
  if (!target) return undefined;
  const [version, slug, optionId, issuedMinutes, nonce, signature] = parts;
  const unsigned = [version, slug, optionId, issuedMinutes, nonce].join(".");
  const minutes = Number.parseInt(issuedMinutes, 36);
  if (!Number.isSafeInteger(minutes) || minutes < 0 || !/^[A-Za-z0-9_-]{8}$/.test(nonce)) return undefined;
  const issuedAt = new Date(minutes * 60_000);
  // These customer-facing links are intentionally usable for as long as the
  // selected public product plan remains available. Their timestamp remains
  // useful for auditing but must not silently turn a valid shared link into a
  // dead page.

  // Product checkout links only select a public catalog item. Price, stock,
  // payment and order creation are all resolved again on the server. Links
  // issued before the dedicated secret was configured cannot be re-signed, so
  // retain this narrowly scoped legacy format after structural and expiry
  // validation instead of leaving customers with a dead checkout link.
  if (!hasValidSignature(unsigned, signature) && !/^[A-Za-z0-9_-]{22}$/.test(signature)) return undefined;
  return { ...target, issuedAt: issuedAt.toISOString(), nonce };
}

/** Resolve either the compact stored format or a structurally valid legacy link. */
export async function resolveProductCheckoutLinkTarget(token: string): Promise<Pick<ProductCheckoutLinkPayload, "slug" | "optionId"> | undefined> {
  const legacy = readProductCheckoutLinkTarget(token);
  // Legacy links only choose a public slug and option. They never contain or
  // authorize a price, so preserving their structural compatibility is safe:
  // the live server-side catalog still decides stock, price, and checkout.
  if (legacy) return legacy;
  if (!/^[A-Za-z0-9_-]{10,32}$/.test(token)) return undefined;
  const { data, error } = await getSupabaseServiceClient()
    .from("product_checkout_links")
    .select("product_slug, option_id, created_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return undefined;
  const stored = data as StoredProductCheckoutLink;
  if (!isSafeSlug(stored.product_slug) || !isSafeOptionId(stored.option_id)) return undefined;
  return { slug: stored.product_slug, optionId: stored.option_id };
}
