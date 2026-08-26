# Catalogue migration

1. Apply `supabase/schema.sql` manually in the Supabase SQL editor. It creates private receipts storage and RLS-protected catalog, settings, product-option, and stock-alert tables without deleting existing data.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ENCRYPTION_KEY` locally. The service role stays server-only.
3. Review first with `npm run migrate:admin-store -- --dry-run`. A dry run reads the JSON and changes no remote data or files.
4. Only after verifying the dry run, run `npm run migrate:admin-store`. It uses idempotent upserts; the JSON source remains in place for verification.

The importer upserts products, stable product-option IDs, orders, encrypted account credentials, and settings. It does not delete products, options, orders, accounts, settings, receipts, or infrastructure configuration. The checkout server action independently resolves submitted product IDs and option IDs before saving an order, so browser-submitted prices and totals are never authoritative.
