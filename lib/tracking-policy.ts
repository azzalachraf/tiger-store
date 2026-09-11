export function isPublicTrackingPath(path: string) {
  try {
    const normalized = decodeURIComponent(path.split(/[?#]/)[0]);
    return normalized.startsWith("/") && !normalized.startsWith("//") && !/^\/(?:admin|api|w|warranty|p|demo)(?:\/|$)/i.test(normalized);
  } catch { return false; }
}

export function safeTrackingUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value, "https://www.tiger-storedz.com");
    return isPublicTrackingPath(url.pathname) ? url.origin + url.pathname : undefined;
  } catch { return undefined; }
}
