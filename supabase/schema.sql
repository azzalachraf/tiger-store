-- Tiger Store: apply manually in the Supabase SQL editor. This file performs no remote action by itself.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create table if not exists public.products (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null, "nameAr" text not null default '', category text not null default '', "categoryAr" text not null default '',
  price integer not null check (price >= 0), "oldPrice" integer check ("oldPrice" is null or "oldPrice" > 0),
  currency text not null default 'DZD' check (currency = 'DZD'), duration text not null default '', "durationAr" text not null default '',
  "shortDescriptionAr" text not null default '', "shortDescriptionEn" text not null default '',
  "featuresAr" jsonb not null default '[]', "featuresEn" jsonb not null default '[]',
  "activationTypeAr" text not null default '', "activationTypeEn" text not null default '', image text not null default '',
  available boolean not null default true, featured boolean not null default false,
  "priceOptions" jsonb not null default '[]', details jsonb, faqs jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists products_available_featured_idx on public.products (available, featured desc);
create index if not exists products_category_idx on public.products (category);

create table if not exists public.settings (
  id text primary key check (id = 'main'), "whatsappNumber" text not null default '', "instagramUrl" text not null default '', "facebookUrl" text not null default '', "domainText" text not null default '', "baridiMobRip" text not null default '', "ccpDetails" text not null default '', "redotPayDetails" text not null default '', "promoHeadings" jsonb not null default '[]', "footerDisclaimer" text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.stock_alerts (
  id uuid primary key, product_id text not null references public.products(id) on delete cascade, option_id text not null default 'default',
  phone text not null check (phone ~ '^\\+213[5-7][0-9]{8}$'), status text not null default 'pending' check (status in ('pending','notified','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (product_id, option_id, phone, status)
);
create index if not exists stock_alerts_pending_idx on public.stock_alerts (status, created_at);

-- Existing application tables preserve their camelCase conventions and integer DZD totals.
create table if not exists public.orders (
  id text primary key, "customerName" text not null default '', phone text not null default '', email text not null default '', products jsonb not null default '[]', "paymentMethod" text not null default '', total integer not null default 0 check (total >= 0), notes text, status text not null default 'pending', "createdAt" text not null default '', "adminNotes" text, utm_source text, utm_medium text, utm_campaign text, referrer text
);
create table if not exists public.accounts (
  id text primary key, email text not null default '', "emailPasswordEncrypted" text not null default '', "chatgptPasswordEncrypted" text not null default '', "dateCreated" text not null default '', price integer not null default 0 check (price >= 0), notes text, status text not null default 'Available', "updatedAt" text not null default ''
);
create table if not exists public.page_events (
  id text primary key, event_type text not null, page_url text, product_id text, session_id text, utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text, referrer text, created_at timestamptz not null default now()
);
create table if not exists public.marketing_config (
  id text primary key default 'main', meta_pixel_id text not null default '', meta_pixel_enabled boolean not null default false, meta_capi_token text not null default '', meta_capi_enabled boolean not null default false, updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.stock_alerts enable row level security;
alter table public.orders enable row level security;
alter table public.accounts enable row level security;
alter table public.page_events enable row level security;
alter table public.marketing_config enable row level security;
-- No anonymous or authenticated policies are created: only the service role may access private/admin data.
revoke all on public.products, public.settings, public.stock_alerts, public.orders, public.accounts, public.page_events, public.marketing_config from anon, authenticated;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at before update on public.settings for each row execute function public.set_updated_at();
drop trigger if exists stock_alerts_set_updated_at on public.stock_alerts;
create trigger stock_alerts_set_updated_at before update on public.stock_alerts for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false) on conflict (id) do update set public = false;
alter table storage.objects enable row level security;
-- Intentionally no receipts policies: receipt access is service-role only.
revoke all on storage.objects from anon, authenticated;
