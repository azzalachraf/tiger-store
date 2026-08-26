-- Tiger Store Supabase schema. Apply manually in the Supabase SQL editor.
-- It is safe to re-run and does not delete application or receipt data.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Catalog rows intentionally retain their camelCase JSON fields so they match
-- the existing application model. DZD amounts are integers everywhere.
create table if not exists public.products (
  id text primary key,
  slug text not null,
  name text not null,
  "nameAr" text not null default '',
  category text not null default '',
  "categoryAr" text not null default '',
  price integer not null default 0,
  "oldPrice" integer,
  currency text not null default 'DZD',
  duration text not null default '',
  "durationAr" text not null default '',
  "shortDescriptionAr" text not null default '',
  "shortDescriptionEn" text not null default '',
  "featuresAr" jsonb not null default '[]'::jsonb,
  "featuresEn" jsonb not null default '[]'::jsonb,
  "activationTypeAr" text not null default '',
  "activationTypeEn" text not null default '',
  image text not null default '',
  available boolean not null default true,
  featured boolean not null default false,
  "priceOptions" jsonb not null default '[]'::jsonb,
  details jsonb,
  faqs jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade a legacy products table without replacing data.
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.products add column if not exists "priceOptions" jsonb not null default '[]'::jsonb;
alter table public.products alter column price type integer using round(price)::integer;
alter table public.products alter column "oldPrice" type integer using case when "oldPrice" is null then null else round("oldPrice")::integer end;
alter table public.products alter column "priceOptions" set default '[]'::jsonb;
alter table public.products alter column "priceOptions" set not null;
alter table public.products drop constraint if exists products_id_format;
alter table public.products add constraint products_id_format check (id ~ '^[a-z0-9-]+$');
alter table public.products drop constraint if exists products_slug_format;
alter table public.products add constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
alter table public.products drop constraint if exists products_price_nonnegative;
alter table public.products add constraint products_price_nonnegative check (price >= 0);
alter table public.products drop constraint if exists products_old_price_nonnegative;
alter table public.products add constraint products_old_price_nonnegative check ("oldPrice" is null or "oldPrice" > 0);
alter table public.products drop constraint if exists products_currency_dzd;
alter table public.products add constraint products_currency_dzd check (currency = 'DZD');
create unique index if not exists products_slug_key on public.products (slug);
create index if not exists products_available_featured_idx on public.products (available, featured desc);
create index if not exists products_category_idx on public.products (category);

-- A typed option table gives each offer a stable per-product ID. The JSON
-- column remains for backwards-compatible product reads during this migration.
create table if not exists public.product_options (
  product_id text not null references public.products(id) on delete cascade,
  id text not null,
  label text not null,
  "labelAr" text not null,
  price integer not null check (price >= 0),
  "oldPrice" integer check ("oldPrice" is null or "oldPrice" > 0),
  duration text not null,
  "durationAr" text not null,
  available boolean not null default true,
  "compatibilityAr" text,
  "compatibilityEn" text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, id),
  check (id ~ '^[a-z0-9][a-z0-9:_-]*$')
);
create index if not exists product_options_availability_idx on public.product_options (product_id, available);

create table if not exists public.settings (
  id text primary key default 'main',
  "whatsappNumber" text not null default '',
  "instagramUrl" text not null default '',
  "facebookUrl" text not null default '',
  "domainText" text not null default '',
  "baridiMobRip" text not null default '',
  "ccpDetails" text not null default '',
  "redotPayDetails" text not null default '',
  "promoHeadings" jsonb not null default '[]'::jsonb,
  "footerDisclaimer" text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id = 'main')
);
alter table public.settings add column if not exists created_at timestamptz not null default now();
alter table public.settings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  option_id text not null default 'default',
  phone text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (phone ~ '^\\+213[5-7][0-9]{8}$'),
  check (status in ('pending', 'notified', 'cancelled')),
  unique (product_id, option_id, phone, status)
);
create index if not exists stock_alerts_pending_idx on public.stock_alerts (status, created_at);
create index if not exists stock_alerts_product_idx on public.stock_alerts (product_id, option_id);

-- Preserve existing orders and their camelCase fields. Do not replace this
-- table: deployed projects may already have records.
create table if not exists public.orders (
  id text primary key,
  "customerName" text not null default '', phone text not null default '', email text not null default '',
  products jsonb not null default '[]'::jsonb, "paymentMethod" text not null default '',
  total integer not null default 0, notes text, status text not null default 'pending',
  "createdAt" text not null default '', "adminNotes" text,
  utm_source text, utm_medium text, utm_campaign text, referrer text
);
alter table public.orders add column if not exists utm_source text;
alter table public.orders add column if not exists utm_medium text;
alter table public.orders add column if not exists utm_campaign text;
alter table public.orders add column if not exists referrer text;
alter table public.orders add column if not exists "receiptPath" text;
alter table public.orders add column if not exists "receiptUploadedAt" text;
alter table public.orders alter column total type integer using round(total)::integer;
alter table public.orders drop constraint if exists orders_total_nonnegative;
alter table public.orders add constraint orders_total_nonnegative check (total >= 0);
create index if not exists orders_created_at_idx on public.orders ("createdAt" desc);
create index if not exists orders_status_idx on public.orders (status);

-- Existing private admin tables retain their conventions.
create table if not exists public.accounts (
  id text primary key, email text not null default '', "emailPasswordEncrypted" text not null default '',
  "chatgptPasswordEncrypted" text not null default '', "dateCreated" text not null default '',
  price integer not null default 0, notes text, status text not null default 'Available', "updatedAt" text not null default ''
);
alter table public.accounts alter column price type integer using round(price)::integer;
alter table public.accounts drop constraint if exists accounts_price_nonnegative;
alter table public.accounts add constraint accounts_price_nonnegative check (price >= 0);

create table if not exists public.page_events (
  id text primary key, event_type text not null, page_url text, product_id text, session_id text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text, referrer text,
  created_at timestamptz not null default now()
);
create table if not exists public.marketing_config (
  id text primary key default 'main', meta_pixel_id text not null default '', meta_pixel_enabled boolean not null default false,
  meta_capi_token text not null default '', meta_capi_enabled boolean not null default false, updated_at timestamptz not null default now()
);
create table if not exists public.admin_login_attempts (
  id uuid primary key default gen_random_uuid(), ip_hash text not null, attempted_at timestamptz not null default now()
);
create index if not exists admin_login_attempts_window_idx on public.admin_login_attempts (ip_hash, attempted_at desc);

alter table public.products enable row level security;
alter table public.product_options enable row level security;
alter table public.settings enable row level security;
alter table public.stock_alerts enable row level security;
alter table public.orders enable row level security;
alter table public.accounts enable row level security;
alter table public.page_events enable row level security;
alter table public.marketing_config enable row level security;
alter table public.admin_login_attempts enable row level security;
-- No anon/authenticated policies: private data is reachable only with the
-- server-only service role. Do not add public catalog policies without an owner decision.
revoke all on public.products, public.product_options, public.settings, public.stock_alerts, public.orders, public.accounts, public.page_events, public.marketing_config from anon, authenticated;
revoke all on public.admin_login_attempts from anon, authenticated;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists product_options_set_updated_at on public.product_options;
create trigger product_options_set_updated_at before update on public.product_options for each row execute function public.set_updated_at();
drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at before update on public.settings for each row execute function public.set_updated_at();
drop trigger if exists stock_alerts_set_updated_at on public.stock_alerts;
create trigger stock_alerts_set_updated_at before update on public.stock_alerts for each row execute function public.set_updated_at();

-- Receipts never receive public access. There are deliberately no storage
-- policies for this bucket; access is limited to the service role.
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
on conflict (id) do update set public = false;
alter table storage.objects enable row level security;
revoke all on storage.objects from anon, authenticated;
