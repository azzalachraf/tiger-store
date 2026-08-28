# Telegram operations foundation

This foundation keeps Telegram identities, roles and all operations data private in Supabase. It does not register a webhook automatically and does not grant access based on a display name, group membership, or a forwarded message.

## Apply the database migration

1. In the Supabase SQL editor, apply [`supabase/schema.sql`](../supabase/schema.sql) if it has not already been applied.
2. Apply [`supabase/migrations/2026-08-28-operations-foundation.sql`](../supabase/migrations/2026-08-28-operations-foundation.sql).
3. Apply [`supabase/migrations/2026-08-28-snapchat-redeem-operations.sql`](../supabase/migrations/2026-08-28-snapchat-redeem-operations.sql).
4. Apply [`supabase/migrations/2026-08-28-snapchat-order-warranties.sql`](../supabase/migrations/2026-08-28-snapchat-order-warranties.sql).
5. Verify that every new table has RLS enabled and that `anon` and `authenticated` have no privileges.

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

## Snapchat redeem-card operations

Redeem inventory has one owner-controlled source: the existing Google Sheet **Redeem cards 2**, tab **Gift Card Inventory**. The application reads it using a dedicated Google service account with Viewer access; it never writes, changes a status, or uploads a code to that sheet.

The sheet contains repeating `Code` / boolean `Status` pairs. The heading above each pair must be exactly one of `24 TRY`, `48 TRY`, `100 INR`, `115 TRY`, `229 TRY`, `199 INR`, or `298 INR`. `TRUE` means available. The owner adds cards in that sheet, then privately runs `/sync_cards`.

Set `GOOGLE_REDEEM_SHEET_ID`, `GOOGLE_REDEEM_SHEET_TAB`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`. Share the sheet with the service-account email as **Viewer**. Do not use a public sheet or an API key.

An approved admin privately sends `/snapchat`, selects a plan and then an allowed card type:

- 1 month: `24 TRY` or `48 TRY`
- 2 months: `100 INR`
- 3 months: `115 TRY`
- 6 months: `229 TRY`
- 12 months: `199 INR` or `298 INR`

The database claims a single card with `FOR UPDATE SKIP LOCKED`, then returns the decrypted code only in that admin's private Telegram chat. Multiple admins can work at once without receiving the same code. **Complete** permanently consumes the card; **Cancel** returns it to available inventory. Admins can only complete or cancel operations they themselves created. The owner gets a private low-stock warning whenever a synchronization finds fewer than five available cards of a type.

Completing a Snapchat operation atomically creates a delivered Tiger Store order, a pending zero-DZD commission record (the owner sets the real commission later), and a single-use public warranty form link. Revenue is taken from the server-resolved Snapchat catalog option; no browser price is involved. The sale remains counted with customer details marked incomplete until the customer submits the form.

The customer link is private and non-indexed. It collects name, username, activation platform, phone, and email in Arabic or English, then shows a review step. Submission is irreversible; later visits show only the certificate. The PDF is French, contains no phone or email, and uses the official Tiger Store logo. `100 INR` and `199 INR` require acknowledgement of the Arabic balance warning before the PDF route becomes available; their expiry adds seven days before the subscription duration. All other card types use the subscription duration directly.

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
