-- Tiger Store operations foundation. Apply after supabase/schema.sql.
-- This migration is additive and idempotent: it never changes or deletes
-- existing orders, products, receipts, accounts, or warranty links.

create extension if not exists pgcrypto;

create table if not exists public.telegram_users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null unique,
  username text,
  first_name text,
  interface_locale text not null default 'ar' check (interface_locale in ('ar', 'en')),
  role text not null default 'pending' check (role in ('pending', 'admin', 'owner')),
  registration_id text not null unique check (registration_id ~ '^TG-[A-Z0-9]{8}$'),
  approved_by_telegram_user_id bigint,
  approved_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((role = 'pending' and approved_at is null and approved_by_telegram_user_id is null) or role in ('admin', 'owner'))
);
create index if not exists telegram_users_role_idx on public.telegram_users (role, last_seen_at desc);
create index if not exists telegram_users_registration_idx on public.telegram_users (registration_id);

-- Immutable audit trail for Telegram and later admin operations. Message text,
-- receipt links, secrets and codes are deliberately not stored here.
create table if not exists public.operation_events (
  id uuid primary key default gen_random_uuid(),
  actor_telegram_user_id bigint references public.telegram_users(telegram_user_id) on delete set null,
  entity_type text not null check (entity_type in ('telegram_user', 'order', 'warranty', 'inventory', 'payment', 'commission', 'adjustment', 'advertising_spend', 'setting')),
  entity_id text not null,
  action text not null check (action ~ '^[a-z][a-z0-9_]{1,79}$'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists operation_events_entity_idx on public.operation_events (entity_type, entity_id, created_at desc);
create index if not exists operation_events_actor_idx on public.operation_events (actor_telegram_user_id, created_at desc);

-- Certificate state complements the existing signed warranty links; it does
-- not replace their current issuance or PDF rendering flow.
create table if not exists public.warranty_certificates (
  id uuid primary key default gen_random_uuid(),
  order_id text references public.orders(id) on delete set null,
  product_id text references public.products(id) on delete restrict,
  option_id text,
  certificate_code text not null unique check (certificate_code ~ '^[A-Z0-9-]{6,80}$'),
  recipient_name text not null default '',
  covered_days integer not null check (covered_days between 1 and 3650),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'claimed', 'replaced', 'refunded', 'cancelled', 'expired')),
  issued_by_telegram_user_id bigint references public.telegram_users(telegram_user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists warranty_certificates_order_idx on public.warranty_certificates (order_id, created_at desc);
create index if not exists warranty_certificates_status_idx on public.warranty_certificates (status, ends_at);

-- A durable assignment log for existing encrypted inventory accounts.
create table if not exists public.inventory_assignments (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references public.accounts(id) on delete restrict,
  order_id text references public.orders(id) on delete set null,
  product_id text references public.products(id) on delete restrict,
  assigned_by_telegram_user_id bigint references public.telegram_users(telegram_user_id) on delete set null,
  assigned_at timestamptz not null default now(),
  released_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (released_at is null or released_at >= assigned_at)
);
create unique index if not exists inventory_assignments_active_account_idx on public.inventory_assignments (account_id) where released_at is null;
create index if not exists inventory_assignments_order_idx on public.inventory_assignments (order_id, assigned_at desc);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  order_id text references public.orders(id) on delete set null,
  recipient_telegram_user_id bigint references public.telegram_users(telegram_user_id) on delete restrict,
  amount_dzd integer not null check (amount_dzd >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'void')),
  note text not null default '',
  created_by_telegram_user_id bigint references public.telegram_users(telegram_user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commissions_recipient_status_idx on public.commissions (recipient_telegram_user_id, status, created_at desc);

create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  order_id text references public.orders(id) on delete set null,
  payment_method text not null check (payment_method in ('BaridiMob', 'Binance', 'RedotPay', 'Flexy', 'CCP', 'cash', 'other')),
  amount_dzd integer not null check (amount_dzd >= 0),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'refunded')),
  verified_by_telegram_user_id bigint references public.telegram_users(telegram_user_id) on delete set null,
  reference text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_records_order_idx on public.payment_records (order_id, created_at desc);
create index if not exists payment_records_status_idx on public.payment_records (status, created_at desc);

create table if not exists public.financial_adjustments (
  id uuid primary key default gen_random_uuid(),
  order_id text references public.orders(id) on delete set null,
  amount_dzd integer not null check (amount_dzd <> 0),
  reason text not null check (char_length(reason) between 2 and 500),
  created_by_telegram_user_id bigint references public.telegram_users(telegram_user_id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists financial_adjustments_order_idx on public.financial_adjustments (order_id, created_at desc);

create table if not exists public.advertising_spend (
  id uuid primary key default gen_random_uuid(),
  spend_date date not null,
  platform text not null check (platform in ('meta', 'instagram', 'facebook', 'other')),
  campaign text not null default '',
  amount_dzd integer not null check (amount_dzd >= 0),
  recorded_by_telegram_user_id bigint references public.telegram_users(telegram_user_id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists advertising_spend_date_idx on public.advertising_spend (spend_date desc, platform);

create table if not exists public.business_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,79}$'),
  value jsonb not null,
  updated_by_telegram_user_id bigint references public.telegram_users(telegram_user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.telegram_users enable row level security;
alter table public.operation_events enable row level security;
alter table public.warranty_certificates enable row level security;
alter table public.inventory_assignments enable row level security;
alter table public.commissions enable row level security;
alter table public.payment_records enable row level security;
alter table public.financial_adjustments enable row level security;
alter table public.advertising_spend enable row level security;
alter table public.business_settings enable row level security;

revoke all on public.telegram_users, public.operation_events, public.warranty_certificates,
  public.inventory_assignments, public.commissions, public.payment_records,
  public.financial_adjustments, public.advertising_spend, public.business_settings
  from anon, authenticated;

drop trigger if exists telegram_users_set_updated_at on public.telegram_users;
create trigger telegram_users_set_updated_at before update on public.telegram_users for each row execute function public.set_updated_at();
drop trigger if exists warranty_certificates_set_updated_at on public.warranty_certificates;
create trigger warranty_certificates_set_updated_at before update on public.warranty_certificates for each row execute function public.set_updated_at();
drop trigger if exists commissions_set_updated_at on public.commissions;
create trigger commissions_set_updated_at before update on public.commissions for each row execute function public.set_updated_at();
drop trigger if exists payment_records_set_updated_at on public.payment_records;
create trigger payment_records_set_updated_at before update on public.payment_records for each row execute function public.set_updated_at();
drop trigger if exists advertising_spend_set_updated_at on public.advertising_spend;
create trigger advertising_spend_set_updated_at before update on public.advertising_spend for each row execute function public.set_updated_at();
drop trigger if exists business_settings_set_updated_at on public.business_settings;
create trigger business_settings_set_updated_at before update on public.business_settings for each row execute function public.set_updated_at();
