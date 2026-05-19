export const WISHLIST_STORAGE_KEY = "tiger-store-wishlist";

export function readWishlist(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeWishlist(ids: string[]) {
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("tiger-store-wishlist-updated"));
}

export function toggleWishlist(productId: string) {
  const current = readWishlist();
  const exists = current.includes(productId);
  const next = exists ? current.filter((id) => id !== productId) : [...current, productId];
  writeWishlist(next);
  return next;
}
