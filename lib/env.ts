import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email address"),
  ADMIN_PASSWORD_HASH: z.string().min(80, "ADMIN_PASSWORD_HASH must be a valid scrypt hash").optional(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters").optional(),
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(32, "SUPABASE_SERVICE_ROLE_KEY is required"),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional().default(""),
  META_CONVERSIONS_API_TOKEN: z.string().optional().default(""),
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_OWNER_PHONE: z.string().optional().default(""),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_CHAT_ID: z.string().optional().default(""),
  TELEGRAM_ADMIN_IDS: z.string().optional().default(""),
  TELEGRAM_OWNER_ID: z.string().regex(/^[1-9][0-9]{0,18}$/).optional().default(""),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(32, "TELEGRAM_WEBHOOK_SECRET must be at least 32 characters").optional().default(""),
  GOOGLE_REDEEM_SHEET_ID: z.string().trim().min(10).optional().default(""),
  GOOGLE_REDEEM_SHEET_TAB: z.string().trim().max(160).optional().default(""),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional().or(z.literal("")).default(""),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(100).optional().or(z.literal("")).default(""),
  WARRANTY_LINK_SECRET: z.string().min(32, "WARRANTY_LINK_SECRET must be at least 32 characters").optional().default(""),
});

let cachedEnv: z.infer<typeof serverEnvSchema> | null = null;

export function getServerEnv() {
  if (cachedEnv) return cachedEnv;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${details}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getEncryptionSecret() {
  return getServerEnv().ENCRYPTION_KEY;
}

export function getWarrantyLinkSecret() {
  return getWarrantyLinkSecrets()[0];
}

/**
 * Keep previously issued private links working after a dedicated warranty key
 * is introduced. All returned values remain server-only secrets; this is only
 * used to verify old HMACs, never exposed to a browser.
 */
export function getWarrantyLinkSecrets() {
  const env = getServerEnv();
  return [...new Set([env.WARRANTY_LINK_SECRET, env.SESSION_SECRET, env.ENCRYPTION_KEY].filter((secret): secret is string => Boolean(secret)))];
}
