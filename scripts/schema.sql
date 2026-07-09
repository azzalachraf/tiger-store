-- ============================================================
-- Tiger Store – Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Products
CREATE TABLE IF NOT EXISTS products (
  id               TEXT PRIMARY KEY,
  slug             TEXT NOT NULL,
  name             TEXT NOT NULL,
  "nameAr"         TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL DEFAULT '',
  "categoryAr"     TEXT NOT NULL DEFAULT '',
  price            NUMERIC NOT NULL DEFAULT 0,
  "oldPrice"       NUMERIC,
  currency         TEXT NOT NULL DEFAULT 'DZD',
  duration         TEXT NOT NULL DEFAULT '',
  "durationAr"     TEXT NOT NULL DEFAULT '',
  "shortDescriptionAr" TEXT NOT NULL DEFAULT '',
  "shortDescriptionEn" TEXT NOT NULL DEFAULT '',
  "featuresAr"     JSONB NOT NULL DEFAULT '[]',
  "featuresEn"     JSONB NOT NULL DEFAULT '[]',
  "activationTypeAr" TEXT NOT NULL DEFAULT '',
  "activationTypeEn" TEXT NOT NULL DEFAULT '',
  image            TEXT NOT NULL DEFAULT '',
  available        BOOLEAN NOT NULL DEFAULT true,
  featured         BOOLEAN NOT NULL DEFAULT false,
  "priceOptions"   JSONB
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 2. Orders
CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  "customerName"   TEXT NOT NULL DEFAULT '',
  phone            TEXT NOT NULL DEFAULT '',
  email            TEXT NOT NULL DEFAULT '',
  products         JSONB NOT NULL DEFAULT '[]',
  "paymentMethod"  TEXT NOT NULL DEFAULT '',
  total            NUMERIC NOT NULL DEFAULT 0,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  "createdAt"      TEXT NOT NULL DEFAULT '',
  "adminNotes"     TEXT
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 3. Accounts (admin inventory of digital accounts)
CREATE TABLE IF NOT EXISTS accounts (
  id                          TEXT PRIMARY KEY,
  email                       TEXT NOT NULL DEFAULT '',
  "emailPasswordEncrypted"    TEXT NOT NULL DEFAULT '',
  "chatgptPasswordEncrypted"  TEXT NOT NULL DEFAULT '',
  "dateCreated"               TEXT NOT NULL DEFAULT '',
  price                       NUMERIC NOT NULL DEFAULT 0,
  notes                       TEXT,
  status                      TEXT NOT NULL DEFAULT 'Available',
  "updatedAt"                 TEXT NOT NULL DEFAULT ''
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- 4. Settings (single-row table, keyed by id = 'main')
CREATE TABLE IF NOT EXISTS settings (
  id                   TEXT PRIMARY KEY DEFAULT 'main',
  "whatsappNumber"     TEXT NOT NULL DEFAULT '',
  "instagramUrl"       TEXT NOT NULL DEFAULT '',
  "facebookUrl"        TEXT NOT NULL DEFAULT '',
  "domainText"         TEXT NOT NULL DEFAULT '',
  "baridiMobRip"       TEXT NOT NULL DEFAULT '',
  "ccpDetails"         TEXT NOT NULL DEFAULT '',
  "redotPayDetails"    TEXT NOT NULL DEFAULT '',
  "promoHeadings"      JSONB NOT NULL DEFAULT '[]',
  "footerDisclaimer"   TEXT NOT NULL DEFAULT ''
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Storage bucket for product image uploads
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public reads on the product-images bucket
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Allow authenticated / service-role inserts
CREATE POLICY "Service role upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated / service-role updates
CREATE POLICY "Service role update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images');

-- Allow authenticated / service-role deletes
CREATE POLICY "Service role delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images');

-- ============================================================
-- 5. Page Events (funnel tracking, visitor analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS page_events (
  id             TEXT PRIMARY KEY,
  event_type     TEXT NOT NULL,
  page_url       TEXT,
  product_id     TEXT,
  session_id     TEXT,
  utm_source     TEXT,
  utm_medium     TEXT,
  utm_campaign   TEXT,
  utm_content    TEXT,
  utm_term       TEXT,
  referrer       TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE page_events ENABLE ROW LEVEL SECURITY;

-- 6. Marketing Configuration
CREATE TABLE IF NOT EXISTS marketing_config (
  id                   TEXT PRIMARY KEY DEFAULT 'main',
  meta_pixel_id        TEXT DEFAULT '',
  meta_pixel_enabled   BOOLEAN DEFAULT false,
  meta_capi_token      TEXT DEFAULT '',
  meta_capi_enabled    BOOLEAN DEFAULT false,
  updated_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE marketing_config ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Add UTM columns to orders (safe IF NOT EXISTS)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='utm_source') THEN
    ALTER TABLE orders ADD COLUMN utm_source TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='utm_medium') THEN
    ALTER TABLE orders ADD COLUMN utm_medium TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='utm_campaign') THEN
    ALTER TABLE orders ADD COLUMN utm_campaign TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='referrer') THEN
    ALTER TABLE orders ADD COLUMN referrer TEXT;
  END IF;
END $$;
