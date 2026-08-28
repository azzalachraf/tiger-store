# Telegram operations foundation

This foundation keeps Telegram identities, roles and all operations data private in Supabase. It does not register a webhook automatically and does not grant access based on a display name, group membership, or a forwarded message.

## Apply the database migration

1. In the Supabase SQL editor, apply [`supabase/schema.sql`](../supabase/schema.sql) if it has not already been applied.
2. Apply [`supabase/migrations/2026-08-28-operations-foundation.sql`](../supabase/migrations/2026-08-28-operations-foundation.sql).
3. Verify that every new table has RLS enabled and that `anon` and `authenticated` have no privileges.

The migration is additive and does not alter catalog rows, existing orders, private receipts, accounts, or the current signed warranty-link flow.

## Environment

Set the variables listed in `.env.local.example` locally and in the hosting provider. Do not put values in Git, chat messages, or logs.

- `TELEGRAM_BOT_TOKEN`: bot token, server only.
- `TELEGRAM_OWNER_ID`: numeric Telegram user ID of the single owner.
- `TELEGRAM_WEBHOOK_SECRET`: 32+ random characters generated locally; used as Telegram's `secret_token`.
- `TELEGRAM_CHAT_ID`: optional existing order-notification group ID.

Generate the webhook secret locally:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Registration and roles

1. The owner sends `/start` to the bot in a private chat. Their numeric ID must match `TELEGRAM_OWNER_ID`; this bootstraps the `owner` role.
2. A new user sends `/start` privately and receives a registration ID such as `TG-AB12CD34`.
3. The owner privately sends `/approve TG-AB12CD34` to make that user an `admin`.
4. Users can save their interface language with `/ar` or `/en`; `/whoami` reports their current role.

Only the verified database identity with role `owner` can approve registrations. Operations commands sent in groups are ignored so registration IDs are not exposed publicly.

## Webhook registration after deployment

Do this only after the deployment contains this route and the environment variables are configured. Replace the placeholders locally; never paste a real token into a public terminal recording.

```powershell
$botToken = "your-bot-token"
$secret = "your-webhook-secret"
$url = "https://your-domain.example/api/telegram/webhook"
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$botToken/setWebhook" -Body @{ url = $url; secret_token = $secret }
```

Telegram must send `X-Telegram-Bot-Api-Secret-Token`; missing or incorrect requests receive HTTP 403. The webhook runs on the Node runtime, validates the update with Zod, and never logs message text, registration IDs, customer data, tokens, or receipt URLs.

## Prepared operations tables

- `telegram_users` and `operation_events`: verified identities and audit events.
- `warranty_certificates`: certificate lifecycle records that complement the existing signed-link/PDF system.
- `inventory_assignments`: allocation history for existing encrypted `accounts` inventory.
- `commissions`, `payment_records`, `financial_adjustments`, `advertising_spend`: integer-DZD operational financial data.
- `business_settings`: private configurable business values.

The tables are a foundation only. They do not change checkout, payment confirmation, product stock, customer accounts, or automatic Telegram order approval.
