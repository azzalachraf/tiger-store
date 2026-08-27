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
