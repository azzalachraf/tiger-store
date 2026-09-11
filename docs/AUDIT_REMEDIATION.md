# Audit remediation — 10 September 2026

## Deployment gate

Do not deploy this revision before the four new migrations are applied. The connected Supabase browser currently requires sign-in; the local environment has a service-role REST key, not a SQL/management connection. No production records have been changed by this work.

Apply manually in this dependency order (the existing repository migration filenames are not chronological dependency order):

1. `supabase/migrations/2026-09-10-audit-security.sql`
2. `supabase/migrations/2026-09-10-audit-warranties.sql`
3. `supabase/migrations/2026-09-10-audit-website-sales.sql`
4. `supabase/migrations/2026-09-10-audit-delivery.sql`

These add state, indexes and functions, replace affected functions/triggers, and remove the three unsafe legacy Storage policies. They contain no historical-row backfill, table reset, customer-data deletion or inventory reset. The permanent-redemption guard treats historical cards with unknown provenance conservatively. Historical manual-use cards require owner review rather than automatic reuse.

Before application, retain the deployment revision and schema definitions/backup using the hosting dashboards. Roll back application code without dropping the additive tables/columns or the permanent-redemption protection; retaining these preserves new claims and deduplication state. Do not restore the unsafe Storage policies. A later cleanup migration must be separately reviewed; do not use DROP CASCADE or erase new state to roll back.

After application, verify Storage policies and role grants in the SQL editor, then deploy the application and smoke-test authenticated flows. Never put service keys or credentials in chat, build artifacts, client environment variables or logs.

## Finding disposition

| # | Finding | Implementation / verification |
|---|---|---|
| 1 | Next/sharp/nanoid/baseline advisories | Blocked upstream upgrade. Registry rejected sharp 0.35.4, nanoid 3.3.18, baseline-browser-mapping 2.11.0 and @next/env 16.3.3 as unavailable. Next image optimization is disabled to close the AVIF endpoint; dependency remediation is NOT declared complete. npm audit also encountered a registry certificate-chain error. Fix registry trust/access, install published patched versions, rerun audit before removing mitigation. |
| 2 | Exposed marketing server actions/token | Store is server-only, page/action authenticate, token no longer sent into the edit form. Action tests and compiled action-manifest regression. |
| 3 | Public product-image writes | Migration drops all three unsafe legacy policies. Local PostgreSQL policy/grant tests; production application/verification pending. |
| 4 | Bearer links in tracking/Meta | Private and encoded-private paths excluded; URLs stripped of query/fragment; private navigation revokes Pixel and clears queued events. Existing stored telemetry is not rewritten. Historical leaked links require a separately authorized redaction/rotation review. |
| 5 | Payment altered by warranty replay | Payment and claim committed in the same locked RPC. Local PostgreSQL replay test. |
| 6 | Cookie-only legacy claim | Durable token-hash claims; verified legacy cookies imported without replacing original identity. Concurrent claim test. Already-expired legacy cookies cannot prove past submission; historical recovery requires owner records. |
| 7 | Website Snapchat fulfillment missing ledger | Atomic reservation binding, completion, costs, credit and certificate for single-item/single-quantity website orders. SQL tests. Multi-item/multi-admin attribution is blocked: existing finance_sales has one administrator and plan per order. Define credit/revenue allocation before expanding it; unsafe premature whole-order completion is prevented. Historical unrecorded costs/credits are not invented or backfilled. |
| 8 | Fixed 365-day coverage / INR handling | Website Snapchat uses normal plan/card expiry and warning flow. Other products derive only explicit configured coverage; unknown/no coverage requires admin review. Coverage tests. |
| 9 | Arabic PDF failures / overflow | Bundled OFL Noto Sans Arabic font with shaping; French certificate layout wraps long rows. Latin/Arabic/long-name PDFs rendered and visually reviewed. |
| 10 | Report row caps | Ordered pagination and bounded IN batches for finance, orders, warranties, inventory, export state, traffic and attribution. 1,501-row regression; prior 1,201-order action regression retained. |
| 11 | Payment race / duplicate settlement | Row-locked payment RPC with request key used by both admin panel and Telegram. PostgreSQL payment/replay tests; action authorization tests. |
| 12 | Replayed Telegram updates | update_id deduplication and encrypted response outbox. Eight concurrent duplicate calls run one mutation; delivery retry does not replay it. Hard process termination between a business commit and queuing its response still requires owner review; never blindly replay a processing/failed update. |
| 13 | Consumed card reissued after order deletion | Permanent redemption marker and database trigger survive operation deletion. Local SQL deletion/restoration rejection tested. |
| 14 | Checkout stale catalogue fallback | Missing, invalid and failed product lookups fail closed. Actual module tests with isolated services. |
| 15 | Flexy disagreement | Gross receipt retained; integer 85% net stored consistently in order, sale and copy sheet; quantity-aware standard pricing and negotiated amounts. SQL standard/discount/replay tests. Historical mismatches need owner-approved reconciliation, not guessed overwrites. |
| 16 | Advertising allocation / historical FX | Uses recorded DZD and includes spend on days without sales. Arithmetic tests. |
| 17 | Failed daily report never retried | Sent acknowledgement follows delivery, lease prevents simultaneous sends, unsuccessful days retried by cron. SQL lease/retry tests. Previously pre-acknowledged failed reports cannot be identified reliably without delivery evidence. |
| 18 | Checkout duplication / forged conversions | Unique checkout request key, HMAC-derived order ID, DB rate limiter, bounded tracking schema, server-side conversion insertion. SQL and validation tests. |
| 19 | Checkout blocked by notifications | Transactional notification outbox and Next after(); bounded network calls; cron retries. Actual external WhatsApp/Telegram delivery not sent during tests. |
| 20 | Inert Meta configuration / CAPI / UTM | Public ID-only configuration, CAPI outbox using configured token, shared purchase event ID, validated stored UTM attribution. Production Meta receipt verification pending configured integration; tests do not send synthetic conversions to production. |
| 21 | Dark product-policy contrast | Theme-specific policy panel; browser contrast assertions >=4.5:1. |
| 22 | French warranty / metadata | French warranty interface and localized product description metadata. Source regressions and component/browser locale checks. |

## Environment and operational setup

- Keep existing Supabase, encryption, warranty, Telegram and WhatsApp credentials server-only and unchanged. No secret rotation was performed. Preserve ENCRYPTION_KEY: encrypted inventory and response jobs depend on it.
- `CRON_SECRET` must be present in Vercel for the existing authenticated daily route. Never prefix it with NEXT_PUBLIC_. This phase does not invent or print its value.
- The existing `/api/cron/daily-owner-report` schedule remains 23:00 UTC (00:00 Algiers). It also retries notification jobs and unsent daily reports. For quicker retries after a failed delivery, invoke that authenticated endpoint from an approved scheduler with `Authorization: Bearer <CRON_SECRET>`. No paid scheduler plan was enabled automatically.
- notification_jobs uses two-minute leases and batches of six; subsequent checkout requests and cron drain further jobs. External messages are at-least-once: a provider success followed by acknowledgement failure can duplicate a message, never the order/payment.
- operation_requests in `processing`, `delivering` or `failed` after an interrupted runtime needs owner review against the business record. Preserve the key. Do not delete it and replay a money/inventory operation blindly. Pending encrypted replies can be retried without repeating the operation.
- Native database tests use PGlite in memory, not a production connection. Concurrent submissions are exercised through its serialized connection; live multi-connection load testing remains a deployment check.
- No production data cleanup or historical financial rewrite is included. No test receipt, customer, payment, card or fake conversion was inserted into production.

## Verification commands

`npm run lint`; `npm run typecheck`; every package script named `test:*`; `npm run build`; `npm audit --json --fetch-retries=0 --fetch-timeout=15000`.

Regression scripts added: `test:audit`, `test:audit-database`, `test:audit-runtime`, `test:audit-ui`. Admin UI tests use synthetic actions; customer UI checks exercise ProductDetails and WarrantyForm components, not a live production order. The warranty fixture uses French labels to exercise the component; actual Arabic/English/French route copy is separately checked in source.

## Changed files

- Admin: `app/admin/finance/actions.ts`, `app/admin/marketing/meta/actions.ts`, `app/admin/marketing/meta/page.tsx`, `components/admin/ActionForm.tsx`.
- Routes: `app/api/cron/daily-owner-report/route.ts`, `app/api/telegram/webhook/route.ts`, `app/api/track/route.ts`, `app/api/marketing/public/route.ts`, `app/checkout/actions.ts`, `app/products/[slug]/page.tsx`, `app/w/[token]/page.tsx`, `app/warranty/actions.ts`, `app/warranty/[token]/page.tsx`, `app/warranty/[token]/certificate.pdf/route.ts`.
- Components/styles: `components/CheckoutView.tsx`, `components/MetaPixelProvider.tsx`, `components/PageTracker.tsx`, `components/ProductDetails.tsx`, `app/globals.css`.
- Services: `lib/admin-store.ts`, `lib/finance.ts`, `lib/marketing-store.ts`, `lib/meta-capi.ts`, `lib/meta-pixel.ts`, `lib/owner-analytics-core.ts`, `lib/owner-analytics.ts`, `lib/snapchat-operations.ts`, `lib/telegram-notifications.ts`, `lib/telegram-operations.ts`, `lib/telegram-warranty-pdf.ts`, `lib/telegram-warranty.ts`, `lib/tiger-new-sheet.ts`, `lib/validation.ts`, `lib/warranty-pdf.ts`, `lib/whatsapp-notifications.ts`, `lib/supabase.ts`, `lib/page-events.ts`.
- New helpers: `lib/coverage-days.ts`, `lib/legacy-warranty-claim.ts`, `lib/notification-jobs.ts`, `lib/pdf-font.ts`, `lib/read-all.ts`, `lib/request-security.ts`, `lib/telegram-delivery.ts`, `lib/tracking-policy.ts`.
- Assets: `assets/fonts/NotoSansArabic.ttf`, `assets/fonts/OFL.txt`.
- Checks/configuration: `scripts/test-audit.ts`, `scripts/test-audit-database.mjs`, `scripts/test-audit-runtime.mjs`, `scripts/test-audit-ui.mjs`, `scripts/audit-ui-fixture.tsx`, `scripts/render-telegram-warranty-pdf.ts`, `scripts/test-admin-actions.mjs`, `next.config.ts`, `package.json`, `package-lock.json`, this document, and the four migrations listed above.
