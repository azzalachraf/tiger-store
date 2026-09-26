import { NextResponse, type NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-constants";
import { isValidAdminSession } from "@/lib/admin-session";

async function isPublicIpBanned(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.SESSION_SECRET;
  if (!url || !key || !secret) return false;
  const ip = (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().replace(/^::ffff:/, "") ?? "unknown").slice(0, 64);
  const ipHash = createHmac("sha256", secret).update(ip).digest("hex");
  try {
    const response = await fetch(`${url}/rest/v1/site_ip_bans?ip_hash=eq.${ipHash}&select=ip_hash&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
    });
    if (!response.ok) return false;
    const rows = await response.json() as unknown[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!isValidAdminSession(session)) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api") && pathname !== "/access-denied" && await isPublicIpBanned(request)) {
    return NextResponse.redirect(new URL("/access-denied", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml).*)"],
};
