import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "crypto";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-constants";
import { getServerEnv } from "@/lib/env";

export function getAdminSessionToken() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = getServerEnv();

  return createHash("sha256")
    .update(`${ADMIN_EMAIL}:${ADMIN_PASSWORD}`)
    .digest("hex");
}

export async function isAdminAuthenticated() {
  const token = getAdminSessionToken();
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!cookieToken || cookieToken.length !== token.length) return false;

  return timingSafeEqual(Buffer.from(cookieToken), Buffer.from(token));
}

export async function requireAdmin() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    redirect("/admin/login");
  }
}
