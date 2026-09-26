"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { canAttemptAdminLogin, createTrackedAdminSession, recordFailedAdminLogin, revokeCurrentAdminSession, safeAdminDestination, verifyAdminCredentials } from "@/lib/admin-auth";
import { encryptAdminIp, hashAdminIp, normalizeClientIp } from "@/lib/admin-network";
import { ADMIN_SECURITY_COOKIE, ADMIN_SESSION_COOKIE } from "@/lib/admin-constants";
import { adminLoginInputSchema } from "@/lib/validation";

export async function loginAction(formData: FormData) {
  const parsed = adminLoginInputSchema.safeParse({ email: formData.get("email"), password: formData.get("password"), next: formData.get("next") });
  const requestHeaders = await headers();
  const ip = normalizeClientIp(requestHeaders.get("x-forwarded-for"));
  const identity = parsed.success && await canAttemptAdminLogin(ip)
    ? await verifyAdminCredentials(parsed.data.email, parsed.data.password)
    : null;
  if (!parsed.success || !identity) { await recordFailedAdminLogin(ip); redirect("/admin/login?error=invalid"); }
  const session = await createTrackedAdminSession(identity, hashAdminIp(ip), encryptAdminIp(ip), requestHeaders.get("user-agent") ?? "");
  (await cookies()).set(ADMIN_SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: session.maxAge });
  redirect(safeAdminDestination(parsed.data.next));
}
export async function logoutAction() {
  await revokeCurrentAdminSession();
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  cookieStore.set(ADMIN_SECURITY_COOKIE, "", { path: "/admin/security", maxAge: 0 });
  redirect("/admin/login");
}
