-- Finance is stored in integer DZD (and integer USD cents) in Supabase.
-- Google Sheets is a derived reporting destination only.

alter table public.telegram_users add column if not exists work_started_at date;
alter table public.telegram_users add column if not exists next_payment_date date;
alter table public.financial_adjustments add column if not exists recipient_telegram_user_id bigint references public.telegram_users(telegram_user_id) on delete restrict;
create index if not exists financial_adjustments_recipient_idx on public.financial_adjustments(recipient_telegram_user_id, created_at desc);

create table if not exists public.finance_settings (
  id text primary key check (id = 'main'),
  usd_dzd_rate integer not null check (usd_dzd_rate between 1 and 100000),
  snapchat_plans jsonb not null,
  card_costs_usd_cents jsonb not null,
  payment_day smallint not null check (payment_day between 1 and 28),
  reporting_sheet_id text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.finance_settings (id, usd_dzd_rate, snapchat_plans, card_costs_usd_cents, payment_day)
values (
  'main', 250,
  '{"1":{"price_dzd":600,"commission_dzd":100},"2":{"price_dzd":800,"commission_dzd":100},"3":{"price_dzd":1600,"commission_dzd":100},"6":{"price_dzd":2000,"commission_dzd":100},"12":{"price_dzd":2300,"commission_dzd":150}}'::jsonb,
  '{"try_24":54,"try_48":108,"inr_100":115,"try_115":260,"inr_199":215,"try_229":500,"inr_298":335}'::jsonb,
  1
) on conflict (id) do nothing;

create table if not exists public.finance_sales (
  order_id text primary key references public.orders(id) on delete restrict,
  operation_id uuid unique references public.snapchat_operations(id) on delete restrict,
  admin_telegram_user_id bigint not null references public.telegram_users(telegram_user_id) on delete restrict,
  plan_months smallint not null check (plan_months in (1,2,3,6,12)),
  card_type text not null check (card_type in ('try_24','try_48','inr_100','try_115','try_229','inr_199','inr_298')),
  revenue_dzd integer not null check (revenue_dzd >= 0),
  commission_dzd integer not null check (commission_dzd >= 0),
  card_cost_usd_cents integer not null check (card_cost_usd_cents >= 0),
  card_cost_dzd integer not null check (card_cost_dzd >= 0),
  gross_profit_dzd integer not null,
  completed_at timestamptz not null default now()
);
create index if not exists finance_sales_admin_idx on public.finance_sales(admin_telegram_user_id, completed_at desc);
create index if not exists finance_sales_day_idx on public.finance_sales(completed_at desc);

create table if not exists public.admin_payments (
  id uuid primary key default gen_random_uuid(),
  admin_telegram_user_id bigint not null references public.telegram_users(telegram_user_id) on delete restrict,
  amount_dzd integer not null check (amount_dzd > 0),
  paid_at timestamptz not null default now(),
  recorded_by_telegram_user_id bigint references public.telegram_users(telegram_user_id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists admin_payments_admin_idx on public.admin_payments(admin_telegram_user_id, paid_at desc);

alter table public.finance_settings enable row level security;
alter table public.finance_sales enable row level security;
alter table public.admin_payments enable row level security;
revoke all on public.finance_settings, public.finance_sales, public.admin_payments from anon, authenticated;

drop trigger if exists finance_settings_set_updated_at on public.finance_settings;
create trigger finance_settings_set_updated_at before update on public.finance_settings for each row execute function public.set_updated_at();

-- This supersedes the earlier warranty completion function. The server resolves
-- finance values from the owner-controlled finance settings, then this routine
-- writes the operation, order, commission and financial sale atomically.
create or replace function public.complete_snapchat_operation_sale(
  p_operation_id uuid, p_admin_telegram_user_id bigint, p_order_id text,
  p_product_item jsonb, p_total integer, p_commission integer,
  p_card_cost_usd_cents integer, p_card_cost_dzd integer,
  p_certificate_code text, p_token_hash text, p_token_hint text,
  p_covered_days integer, p_ends_at timestamptz, p_balance_warning_required boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare operation_row public.snapchat_operations%rowtype;
declare certificate_id uuid;
begin
  select * into operation_row from public.snapchat_operations where id = p_operation_id and admin_telegram_user_id = p_admin_telegram_user_id and status = 'active' for update;
  if not found then raise exception 'Operation unavailable'; end if;
  if p_total < 1 or p_commission < 0 or p_card_cost_usd_cents < 0 or p_card_cost_dzd < 0 or p_covered_days < 1 or p_certificate_code !~ '^[A-Z0-9-]{6,80}$' or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid sale'; end if;
  update public.snapchat_operations set status = 'completed', completed_at = now() where id = operation_row.id;
  update public.redeem_cards set status = 'consumed', consumed_at = now() where id = operation_row.redeem_card_id;
  insert into public.orders (id, "customerName", phone, email, products, "paymentMethod", total, notes, status, "createdAt", "adminNotes") values (p_order_id, 'Customer details incomplete', 'incomplete', '', jsonb_build_array(p_product_item), 'Telegram', p_total, 'Telegram Snapchat sale. Customer warranty details incomplete.', 'delivered', now()::text, 'Created from a completed Telegram Snapchat operation.');
  insert into public.commissions (order_id, recipient_telegram_user_id, amount_dzd, status, note, created_by_telegram_user_id) values (p_order_id, p_admin_telegram_user_id, p_commission, 'pending', 'Fixed Snapchat commission.', p_admin_telegram_user_id);
  insert into public.finance_sales (order_id, operation_id, admin_telegram_user_id, plan_months, card_type, revenue_dzd, commission_dzd, card_cost_usd_cents, card_cost_dzd, gross_profit_dzd) values (p_order_id, operation_row.id, p_admin_telegram_user_id, operation_row.plan_months, operation_row.card_type, p_total, p_commission, p_card_cost_usd_cents, p_card_cost_dzd, p_total - p_commission - p_card_cost_dzd);
  insert into public.warranty_certificates (operation_id, order_id, product_id, option_id, certificate_code, recipient_name, covered_days, starts_at, ends_at, status, issued_by_telegram_user_id, public_token_hash, public_token_hint, balance_warning_required) values (operation_row.id, p_order_id, 'snapchat-plus', p_product_item->>'optionId', p_certificate_code, '', p_covered_days, now(), p_ends_at, 'active', p_admin_telegram_user_id, p_token_hash, p_token_hint, p_balance_warning_required) returning id into certificate_id;
  insert into public.operation_events (actor_telegram_user_id, entity_type, entity_id, action, metadata) values (p_admin_telegram_user_id, 'order', p_order_id, 'snapchat_operation_completed_sale_created', jsonb_build_object('operation_id', operation_row.id, 'certificate_id', certificate_id));
  return certificate_id;
end;
$$;

revoke all on function public.complete_snapchat_operation_sale(uuid,bigint,text,jsonb,integer,integer,integer,integer,text,text,text,integer,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.complete_snapchat_operation_sale(uuid,bigint,text,jsonb,integer,integer,integer,integer,text,text,text,integer,timestamptz,boolean) to service_role;

revoke all on function public.complete_snapchat_operation_sale(uuid,bigint,text,jsonb,integer,text,text,text,integer,timestamptz,boolean) from public, anon, authenticated;
