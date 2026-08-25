# Catalogue migration

1. Run `scripts/migrations/2026-08-25-catalogue-details.sql` in the Supabase SQL editor.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` locally.
3. Run `npx tsx scripts/seed-supabase.ts`.

The seed upserts the 17 Tiger Store catalogue records by stable IDs. It does not delete products, orders, accounts, settings, or infrastructure configuration. The checkout server action independently resolves product IDs and offer labels from the catalogue before saving an order, so browser-submitted prices and totals are never authoritative.
