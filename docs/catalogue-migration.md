# Catalogue migration

1. Run `supabase/schema.sql` in the Supabase SQL editor. This creates private receipts storage and RLS-protected catalog, settings, and stock-alert tables.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` locally.
3. Review first with `npx tsx scripts/migrate-admin-store-to-supabase.ts --dry-run`.
4. Only after verifying the dry run, run `npx tsx scripts/migrate-admin-store-to-supabase.ts`. The JSON source is retained and all writes are idempotent upserts.

The seed upserts the 17 Tiger Store catalogue records by stable IDs. It does not delete products, orders, accounts, settings, or infrastructure configuration. The checkout server action independently resolves product IDs and offer labels from the catalogue before saving an order, so browser-submitted prices and totals are never authoritative.
