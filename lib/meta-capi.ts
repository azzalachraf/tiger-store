import "server-only";

import { createHash } from "crypto";

const GRAPH_API_VERSION = "v19.0";

type CAPIEventData = {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: "website";
  user_data: {
    em?: string[];
    ph?: string[];
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: Record<string, unknown>;
};

function hashSHA256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/**
 * Send a server-side event to Meta Conversions API.
 * Returns true on success, false on failure.
 */
export async function sendConversionEvent(params: {
  pixelId: string;
  accessToken: string;
  eventName: string;
  eventId: string;
  sourceUrl?: string;
  email?: string;
  phone?: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentType?: string;
  orderId?: string;
  numItems?: number;
}): Promise<{ success: boolean; error?: string }> {
  const {
    pixelId,
    accessToken,
    eventName,
    eventId,
    sourceUrl,
    email,
    phone,
    value,
    currency = "DZD",
    contentIds,
    contentType = "product",
    orderId,
    numItems,
  } = params;

  if (!pixelId || !accessToken) {
    return { success: false, error: "Missing pixel ID or access token" };
  }

  const userData: CAPIEventData["user_data"] = {
    action_source: "website" as const,
  } as CAPIEventData["user_data"];

  if (email) userData.em = [hashSHA256(email)];
  if (phone) userData.ph = [hashSHA256(phone)];

  const customData: Record<string, unknown> = {};
  if (value !== undefined) customData.value = value;
  if (currency) customData.currency = currency;
  if (contentIds?.length) customData.content_ids = contentIds;
  if (contentType) customData.content_type = contentType;
  if (orderId) customData.order_id = orderId;
  if (numItems !== undefined) customData.num_items = numItems;

  const eventData: CAPIEventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    user_data: userData,
    custom_data: Object.keys(customData).length ? customData : undefined,
  };

  if (sourceUrl) eventData.event_source_url = sourceUrl;

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [eventData],
        access_token: accessToken,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Meta CAPI error:", response.status, body);
      return { success: false, error: `HTTP ${response.status}: ${body}` };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Meta CAPI exception:", message);
    return { success: false, error: message };
  }
}
