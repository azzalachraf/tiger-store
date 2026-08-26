"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { canAttemptAdminLogin, createAdminSession, normalizeClientIp, recordFailedAdminLogin, safeAdminDestination, verifyAdminCredentials } from "@/lib/admin-auth";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-constants";
import { adminLoginInputSchema } from "@/lib/validation";

export async function loginAction(formData: FormData) {
  const parsed = adminLoginInputSchema.safeParse({ email: formData.get("email"), password: formData.get("password"), next: formData.get("next") });
  const ip = normalizeClientIp((await headers()).get("x-forwarded-for"));
  if (!parsed.success || !(await canAttemptAdminLogin(ip)) || !verifyAdminCredentials(parsed.success ? parsed.data.email : "", parsed.success ? parsed.data.password : "")) { await recordFailedAdminLogin(ip); redirect("/admin/login?error=invalid"); }
  (await cookies()).set(ADMIN_SESSION_COOKIE, createAdminSession(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  redirect(safeAdminDestination(parsed.data.next));
}
export async function logoutAction() { (await cookies()).delete(ADMIN_SESSION_COOKIE); redirect("/admin/login"); }
