import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "crypto";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-constants";

export function getAdminSessionToken() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return createHash("sha256")
    .update(`${email}:${password}`)
    .digest("hex");
}

export async function isAdminAuthenticated() {
  const token = getAdminSessionToken();
  if (!token) return false;

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value === token;
}

export async function requireAdmin() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    redirect("/admin/login");
  }
}
