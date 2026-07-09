/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Meta Pixel (client-side) tracking helpers.
 * All functions are safe to call even if the pixel is not loaded.
 */

declare global {
  interface Window {
    fbq?: ((...args: any[]) => void) & { callMethod?: (...args: any[]) => void; queue: any[]; loaded: boolean; version: string; push: (...args: any[]) => void };
    _fbq?: typeof window.fbq;
  }
}

let initialized = false;

/** Inject the Meta Pixel base code and initialise with the given Pixel ID. */
export function initPixel(pixelId: string) {
  if (initialized || !pixelId || typeof window === "undefined") return;

  const f = window;
  const b = document;
  if (f.fbq) return;

  const n: any = (f.fbq = (function (...args: any[]) {
    if (n.callMethod) {
      n.callMethod(...args);
    } else {
      n.queue.push(args);
    }
  } as any));
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  const t = b.createElement("script");
  t.async = true;
  t.src = "https://connect.facebook.net/en_US/fbevents.js";
  const s = b.getElementsByTagName("script")[0];
  s?.parentNode?.insertBefore(t, s);

  window.fbq?.("init", pixelId);
  initialized = true;
}

function fbq(...args: any[]) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq(...args);
  }
}

/** Generate a unique event ID for deduplication with CAPI. */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function trackPageView() {
  fbq("track", "PageView");
}

export function trackViewContent(product: {
  id: string;
  name: string;
  category: string;
  price: number;
}) {
  const eventId = generateEventId();
  fbq("track", "ViewContent", {
    content_ids: [product.id],
    content_name: product.name,
    content_category: product.category,
    content_type: "product",
    value: product.price,
    currency: "DZD",
  }, { eventID: eventId });
  return eventId;
}

export function trackAddToCart(item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) {
  const eventId = generateEventId();
  fbq("track", "AddToCart", {
    content_ids: [item.id],
    content_name: item.name,
    content_type: "product",
    value: item.price * item.quantity,
    currency: "DZD",
    num_items: item.quantity,
  }, { eventID: eventId });
  return eventId;
}

export function trackInitiateCheckout(total: number, numItems: number) {
  const eventId = generateEventId();
  fbq("track", "InitiateCheckout", {
    value: total,
    currency: "DZD",
    num_items: numItems,
  }, { eventID: eventId });
  return eventId;
}

export function trackPurchase(orderId: string, total: number, items: { id: string }[]) {
  const eventId = generateEventId();
  fbq("track", "Purchase", {
    content_ids: items.map((i) => i.id),
    content_type: "product",
    value: total,
    currency: "DZD",
    order_id: orderId,
    num_items: items.length,
  }, { eventID: eventId });
  return eventId;
}

export function trackSearch(query: string) {
  fbq("track", "Search", { search_string: query });
}

export function trackContact() {
  fbq("track", "Contact");
}
