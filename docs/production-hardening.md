# Production hardening notes

## Environment variables

`ENCRYPTION_KEY` is now required for encrypting stored account credentials. It must be a dedicated random secret and must not reuse `ADMIN_PASSWORD`, `ADMIN_EMAIL`, the Supabase service role key, or any public key.

Generate a strong value locally with:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Add the value to `.env.local` for local development and to Vercel environment variables before deploying.

## Supabase service role usage

The service-role Supabase client is now created only in `lib/supabase.ts`, marked `server-only`, and exposed as `getSupabaseServiceClient()`. This keeps privileged database access out of client components and makes service-role usage explicit.

## Validation boundaries

Server actions and public API routes now validate critical payloads with Zod before persisting data:

- checkout order submissions
- admin product saves
- admin order status/manual sale workflows
- site settings saves
- public funnel tracking events

## Admin workflow safety

Admin order status updates no longer trust a serialized order object from the browser. The server loads the existing order by id, applies only the intended status and admin notes changes, then validates before saving.

## Deployment caution

Existing encrypted account passwords were previously derived from admin credentials. After switching to `ENCRYPTION_KEY`, previously encrypted values can only decrypt if the new key matches the old derivation source. Plan a one-time migration or re-enter account credentials if old inventory passwords are needed.
