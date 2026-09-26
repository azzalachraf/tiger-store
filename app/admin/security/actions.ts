"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADMIN_SECURITY_COOKIE, ADMIN_SESSION_COOKIE } from "@/lib/admin-constants";
import { requireAdminAction } from "@/lib/admin-auth";
import { hashAdminIp, normalizeClientIp } from "@/lib/admin-network";
import { hashAdminPassword } from "@/lib/admin-password";
import { getAdminSecurityPinState, requireAdminSecurityAction, verifyAdminSecurityPin } from "@/lib/admin-security";
import { ADMIN_SECURITY_TTL_SECONDS, createAdminSecurityToken } from "@/lib/admin-session";
import { getServerEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { adminIpHashSchema, adminSecurityPinChangeSchema, adminSecurityPinSchema, adminSessionIdSchema, adminUserCreateSchema, adminUserIdSchema, siteVisitorIdSchema } from "@/lib/validation";

const PIN_WINDOW_SECONDS = 15 * 60;
const MAX_PIN_ATTEMPTS = 5;

export async function unlockAdminSecurityAction(formData: FormData) {
  await requireAdminAction();
  const parsed = adminSecurityPinSchema.safeParse(formData.get("pin"));
  const ip = normalizeClientIp((await headers()).get("x-forwarded-for"));
  const ipHash = hashAdminIp(ip);
  const client = getSupabaseServiceClient();
  const { count, error } = await client.from("admin_security_pin_attempts").select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash).gte("attempted_at", new Date(Date.now() - PIN_WINDOW_SECONDS * 1000).toISOString());
  if (error) throw new Error("PIN security store unavailable.");
  const pinState = await getAdminSecurityPinState();
  if ((count ?? 0) >= MAX_PIN_ATTEMPTS || !parsed.success || !verifyAdminSecurityPin(parsed.data, pinState.pinHash)) {
    await client.from("admin_security_pin_attempts").insert({ ip_hash: ipHash });
    redirect("/admin/security?error=invalid-pin");
  }
  (await cookies()).set(ADMIN_SECURITY_COOKIE, createAdminSecurityToken(pinState.pinVersion), {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/admin/security", maxAge: ADMIN_SECURITY_TTL_SECONDS,
  });
  redirect("/admin/security");
}

export async function changeAdminSecurityPinAction(formData: FormData) {
  const current = await requireAdminSecurityAction();
  if (!current.identity.isOwner) throw new Error("Only the owner can change the security PIN.");
  const parsed = adminSecurityPinChangeSchema.safeParse({
    currentPin: formData.get("currentPin"), newPin: formData.get("newPin"), confirmPin: formData.get("confirmPin"),
  });
  if (!parsed.success) redirect("/admin/security?pinStatus=invalid");
  const currentState = await getAdminSecurityPinState();
  if (!verifyAdminSecurityPin(parsed.data.currentPin, currentState.pinHash)) redirect("/admin/security?pinStatus=incorrect");
  const pinVersion = randomUUID();
  const { error } = await getSupabaseServiceClient().from("admin_security_settings").upsert({
    id: "main", pin_hash: hashAdminPassword(parsed.data.newPin), pin_version: pinVersion,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("Security PIN could not be changed.");
  (await cookies()).set(ADMIN_SECURITY_COOKIE, createAdminSecurityToken(pinVersion), {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/admin/security", maxAge: ADMIN_SECURITY_TTL_SECONDS,
  });
  redirect("/admin/security?pinStatus=changed");
}

export async function lockAdminSecurityAction() {
  await requireAdminAction();
  (await cookies()).set(ADMIN_SECURITY_COOKIE, "", { path: "/admin/security", maxAge: 0 });
  redirect("/admin/security");
}

export async function createAdminUserAction(formData: FormData) {
  const current = await requireAdminSecurityAction();
  const parsed = adminUserCreateSchema.parse({
    displayName: formData.get("displayName"), email: formData.get("email"), password: formData.get("password"),
  });
  if (parsed.email === getServerEnv().ADMIN_EMAIL.trim().toLowerCase()) throw new Error("The owner email is already configured.");
  const { error } = await getSupabaseServiceClient().from("admin_users").insert({
    email: parsed.email,
    display_name: parsed.displayName,
    password_hash: hashAdminPassword(parsed.password),
    created_by_email: current.identity.email,
  });
  if (error) throw new Error(error.code === "23505" ? "An administrator with this email already exists." : "Administrator could not be created.");
  revalidatePath("/admin/security");
}

export async function setAdminUserActiveAction(formData: FormData) {
  await requireAdminSecurityAction();
  const id = adminUserIdSchema.parse(formData.get("id"));
  const isActive = formData.get("active") === "true";
  const { error } = await getSupabaseServiceClient().from("admin_users").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error("Administrator status could not be changed.");
  if (!isActive) await getSupabaseServiceClient().from("admin_sessions").update({ revoked_at: new Date().toISOString(), revoked_reason: "Administrator disabled" }).eq("admin_user_id", id).is("revoked_at", null);
  revalidatePath("/admin/security");
}

export async function revokeAdminSessionAction(formData: FormData) {
  const current = await requireAdminSecurityAction();
  const id = adminSessionIdSchema.parse(formData.get("id"));
  const { error } = await getSupabaseServiceClient().from("admin_sessions").update({ revoked_at: new Date().toISOString(), revoked_reason: "Revoked from security panel" }).eq("id", id).is("revoked_at", null);
  if (error) throw new Error("Session could not be revoked.");
  if (id === current.sessionId) {
    const store = await cookies();
    store.delete(ADMIN_SESSION_COOKIE);
    store.set(ADMIN_SECURITY_COOKIE, "", { path: "/admin/security", maxAge: 0 });
    redirect("/admin/login");
  }
  revalidatePath("/admin/security");
}

export async function banAdminSessionIpAction(formData: FormData) {
  const current = await requireAdminSecurityAction();
  const id = adminSessionIdSchema.parse(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  const client = getSupabaseServiceClient();
  const { data: target, error } = await client.from("admin_sessions").select("ip_hash, ip_encrypted").eq("id", id).maybeSingle<{ ip_hash: string; ip_encrypted: string }>();
  if (error || !target) throw new Error("Session IP could not be found.");
  if (target.ip_hash === current.ipHash) throw new Error("You cannot ban the IP used by your current session.");
  const { error: banError } = await client.from("admin_ip_bans").upsert({
    ip_hash: target.ip_hash, ip_encrypted: target.ip_encrypted, reason, created_by_email: current.identity.email, banned_at: new Date().toISOString(),
  });
  if (banError) throw new Error("IP address could not be banned.");
  await client.from("admin_sessions").update({ revoked_at: new Date().toISOString(), revoked_reason: "IP banned" }).eq("ip_hash", target.ip_hash).is("revoked_at", null);
  revalidatePath("/admin/security");
}

export async function unbanAdminIpAction(formData: FormData) {
  await requireAdminSecurityAction();
  const ipHash = adminIpHashSchema.parse(formData.get("ipHash"));
  const { error } = await getSupabaseServiceClient().from("admin_ip_bans").delete().eq("ip_hash", ipHash);
  if (error) throw new Error("IP address could not be unbanned.");
  revalidatePath("/admin/security");
}

export async function banSiteVisitorIpAction(formData: FormData) {
  const current = await requireAdminSecurityAction();
  const id = siteVisitorIdSchema.parse(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  const client = getSupabaseServiceClient();
  const { data: visitor, error } = await client.from("site_visitor_devices").select("ip_hash, ip_encrypted").eq("id", id).maybeSingle<{ ip_hash: string; ip_encrypted: string }>();
  if (error || !visitor) throw new Error("Visitor device could not be found.");
  const { error: banError } = await client.from("site_ip_bans").upsert({
    ip_hash: visitor.ip_hash, ip_encrypted: visitor.ip_encrypted, reason,
    created_by_email: current.identity.email, banned_at: new Date().toISOString(),
  });
  if (banError) throw new Error("Visitor IP could not be banned.");
  revalidatePath("/admin/security");
}

export async function unbanSiteVisitorIpAction(formData: FormData) {
  await requireAdminSecurityAction();
  const ipHash = adminIpHashSchema.parse(formData.get("ipHash"));
  const { error } = await getSupabaseServiceClient().from("site_ip_bans").delete().eq("ip_hash", ipHash);
  if (error) throw new Error("Visitor IP could not be unbanned.");
  revalidatePath("/admin/security");
}
