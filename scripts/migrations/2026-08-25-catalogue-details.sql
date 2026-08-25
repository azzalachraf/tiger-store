-- Safe catalogue enrichment migration. Run once in the Supabase SQL editor,
-- then run `npx tsx scripts/seed-supabase.ts` with service-role credentials.
ALTER TABLE products ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS faqs JSONB;
