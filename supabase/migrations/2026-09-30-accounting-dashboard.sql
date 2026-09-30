-- Accounting periods and cash-account reconciliation for the admin workspace.
-- All monetary values are integer DZD. Opening balances and transfers never
-- count as revenue or profit.

create table if not exists public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  starts_on date not null unique,
  ends_on date,
  status text not null check (status in ('open', 'closed')),
  created_by_email text not null default '',
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create unique index if not exists accounting_periods_one_open_idx on public.accounting_periods(status) where status = 'open';

create table if not exists public.accounting_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,39}$'),
  name text not null check (char_length(name) between 2 and 80),
  payment_method text not null unique check (payment_method in ('BaridiMob', 'Flexy', 'Binance', 'RedotPay')),
  currency text not null default 'DZD' check (currency = 'DZD'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_transactions (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.accounting_periods(id) on delete restrict,
  kind text not null check (kind in ('sale', 'expense', 'transfer', 'opening_balance')),
  amount_dzd integer not null,
  occurred_on date not null,
  account_id uuid not null references public.accounting_accounts(id) on delete restrict,
  transfer_account_id uuid references public.accounting_accounts(id) on delete restrict,
  order_id text references public.orders(id) on delete set null,
  payment_record_id uuid unique references public.payment_records(id) on delete set null,
  payment_method text check (payment_method in ('BaridiMob', 'Flexy', 'Binance', 'RedotPay')),
  reference text not null default '',
  note text not null default '',
  created_by_email text not null,
  created_at timestamptz not null default now(),
  check (
    (kind = 'transfer' and amount_dzd > 0 and transfer_account_id is not null and transfer_account_id <> account_id and order_id is null)
    or (kind = 'opening_balance' and amount_dzd <> 0 and transfer_account_id is null and order_id is null)
    or (kind in ('sale', 'expense') and amount_dzd > 0 and transfer_account_id is null)
  ),
  check ((kind = 'sale' and payment_method is not null) or (kind <> 'sale' and payment_method is null))
);
create index if not exists accounting_transactions_period_day_idx on public.accounting_transactions(period_id, occurred_on desc, created_at desc);
create index if not exists accounting_transactions_order_idx on public.accounting_transactions(order_id) where order_id is not null;

create table if not exists public.admin_balance_resets (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.accounting_periods(id) on delete restrict,
  admin_telegram_user_id bigint not null references public.telegram_users(telegram_user_id) on delete restrict,
  effective_at timestamptz not null,
  previous_commission_dzd integer not null,
  previous_paid_dzd integer not null,
  previous_adjustments_dzd integer not null,
  previous_outstanding_dzd integer not null,
  reason text not null check (char_length(reason) between 2 and 500),
  created_by_email text not null,
  created_at timestamptz not null default now(),
  unique(period_id, admin_telegram_user_id)
);
create index if not exists admin_balance_resets_admin_idx on public.admin_balance_resets(admin_telegram_user_id, effective_at desc);

alter table public.accounting_periods enable row level security;
alter table public.accounting_accounts enable row level security;
alter table public.accounting_transactions enable row level security;
alter table public.admin_balance_resets enable row level security;
revoke all on public.accounting_periods, public.accounting_accounts, public.accounting_transactions, public.admin_balance_resets from anon, authenticated;

drop trigger if exists accounting_accounts_set_updated_at on public.accounting_accounts;
create trigger accounting_accounts_set_updated_at before update on public.accounting_accounts for each row execute function public.set_updated_at();

insert into public.accounting_accounts(code, name, payment_method) values
  ('baridimob', 'BaridiMob', 'BaridiMob'),
  ('flexy', 'Flexy', 'Flexy'),
  ('binance', 'Binance', 'Binance'),
  ('redotpay', 'RedotPay', 'RedotPay')
on conflict (code) do update set name = excluded.name, payment_method = excluded.payment_method;

insert into public.accounting_periods(name, starts_on, ends_on, status, created_by_email)
values ('Previous history', date '2000-01-01', date '2026-09-29', 'closed', 'azzalachraf@gmail.com')
on conflict (starts_on) do nothing;

insert into public.accounting_periods(name, starts_on, ends_on, status, created_by_email)
values ('Current period', date '2026-09-30', null, 'open', 'azzalachraf@gmail.com')
on conflict (starts_on) do nothing;

-- Capture every active administrator's lifetime balance before starting the new
-- period. This is a non-cash opening reset: no payment or withdrawal is created.
with current_period as (
  select id from public.accounting_periods where starts_on = date '2026-09-30'
), balances as (
  select
    u.telegram_user_id,
    coalesce((select sum(s.commission_dzd) from public.finance_sales s where s.admin_telegram_user_id = u.telegram_user_id), 0)::integer as commission_dzd,
    coalesce((select sum(p.amount_dzd) from public.admin_payments p where p.admin_telegram_user_id = u.telegram_user_id), 0)::integer as paid_dzd,
    coalesce((select sum(a.amount_dzd) from public.financial_adjustments a where a.recipient_telegram_user_id = u.telegram_user_id), 0)::integer as adjustments_dzd
  from public.telegram_users u
  where u.role in ('owner', 'admin')
)
insert into public.admin_balance_resets(
  period_id, admin_telegram_user_id, effective_at,
  previous_commission_dzd, previous_paid_dzd, previous_adjustments_dzd,
  previous_outstanding_dzd, reason, created_by_email
)
select current_period.id, balances.telegram_user_id, timestamptz '2026-09-30 00:00:00+01',
  balances.commission_dzd, balances.paid_dzd, balances.adjustments_dzd,
  balances.commission_dzd + balances.adjustments_dzd - balances.paid_dzd,
  'Opening reset for the accounting period beginning 2026-09-30. Previous balance settled outside the new period; no cash movement recorded.',
  'azzalachraf@gmail.com'
from current_period cross join balances
on conflict (period_id, admin_telegram_user_id) do nothing;

create or replace function public.record_accounting_sale(
  p_order_id text, p_customer_name text, p_amount_dzd integer,
  p_payment_method text, p_account_id uuid, p_occurred_on date,
  p_reference text, p_note text, p_created_by_email text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_period_id uuid; v_payment_id uuid; v_transaction_id uuid; v_account_method text;
begin
  if p_order_id !~ '^[A-Za-z0-9_-]{1,160}$' or char_length(trim(p_customer_name)) not between 1 and 160
    or p_amount_dzd < 1 or p_payment_method not in ('BaridiMob','Flexy','Binance','RedotPay')
    or char_length(p_reference) > 240 or char_length(p_note) > 1200 then raise exception 'Invalid accounting sale'; end if;
  select id into v_period_id from public.accounting_periods where status = 'open' and p_occurred_on >= starts_on and (ends_on is null or p_occurred_on <= ends_on);
  if v_period_id is null then raise exception 'No open accounting period for this date'; end if;
  select payment_method into v_account_method from public.accounting_accounts where id = p_account_id and active for update;
  if v_account_method is distinct from p_payment_method then raise exception 'Payment account does not match method'; end if;
  insert into public.orders(id, "customerName", phone, email, products, "paymentMethod", total, notes, status, "createdAt", "adminNotes")
  values(p_order_id, trim(p_customer_name), 'manual', '', '[]'::jsonb, p_payment_method, p_amount_dzd, nullif(trim(p_note),''), 'paid', (p_occurred_on::timestamptz)::text, 'Created from the accounting dashboard.');
  insert into public.payment_records(order_id, payment_method, amount_dzd, status, reference, created_at)
  values(p_order_id, p_payment_method, p_amount_dzd, 'verified', trim(p_reference), p_occurred_on::timestamptz) returning id into v_payment_id;
  insert into public.accounting_transactions(period_id, kind, amount_dzd, occurred_on, account_id, order_id, payment_record_id, payment_method, reference, note, created_by_email)
  values(v_period_id, 'sale', p_amount_dzd, p_occurred_on, p_account_id, p_order_id, v_payment_id, p_payment_method, trim(p_reference), trim(p_note), p_created_by_email)
  returning id into v_transaction_id;
  return v_transaction_id;
end; $$;

create or replace function public.record_accounting_movement(
  p_kind text, p_amount_dzd integer, p_occurred_on date,
  p_account_id uuid, p_transfer_account_id uuid,
  p_order_id text, p_reference text, p_note text, p_created_by_email text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_period_id uuid; v_payment_id uuid; v_transaction_id uuid; v_method text; v_order_total integer; v_order_method text;
begin
  if p_kind not in ('sale','expense','transfer','opening_balance') or p_amount_dzd = 0
    or (p_kind <> 'opening_balance' and p_amount_dzd < 1)
    or char_length(p_reference) > 240 or char_length(p_note) > 1200 then raise exception 'Invalid accounting movement'; end if;
  select id into v_period_id from public.accounting_periods where status = 'open' and p_occurred_on >= starts_on and (ends_on is null or p_occurred_on <= ends_on);
  if v_period_id is null then raise exception 'No open accounting period for this date'; end if;
  select payment_method into v_method from public.accounting_accounts where id = p_account_id and active;
  if v_method is null then raise exception 'Account unavailable'; end if;
  if p_kind = 'transfer' then
    if p_transfer_account_id is null or p_transfer_account_id = p_account_id or not exists(select 1 from public.accounting_accounts where id = p_transfer_account_id and active) then raise exception 'Invalid transfer accounts'; end if;
  elsif p_transfer_account_id is not null then raise exception 'Unexpected transfer account';
  end if;
  if p_kind = 'sale' then
    select total, "paymentMethod" into v_order_total, v_order_method from public.orders where id = p_order_id and status in ('paid','delivered') for update;
    if not found then raise exception 'Paid order unavailable'; end if;
    if v_order_method <> v_method then raise exception 'Order method does not match account'; end if;
    insert into public.payment_records(order_id, payment_method, amount_dzd, status, reference, created_at)
    values(p_order_id, v_method, p_amount_dzd, 'verified', trim(p_reference), p_occurred_on::timestamptz) returning id into v_payment_id;
  elsif p_order_id is not null then raise exception 'Order is only valid for a sale';
  end if;
  insert into public.accounting_transactions(period_id, kind, amount_dzd, occurred_on, account_id, transfer_account_id, order_id, payment_record_id, payment_method, reference, note, created_by_email)
  values(v_period_id, p_kind, p_amount_dzd, p_occurred_on, p_account_id, p_transfer_account_id, p_order_id, v_payment_id, case when p_kind = 'sale' then v_method else null end, trim(p_reference), trim(p_note), p_created_by_email)
  returning id into v_transaction_id;
  return v_transaction_id;
end; $$;

revoke all on function public.record_accounting_sale(text,text,integer,text,uuid,date,text,text,text) from public, anon, authenticated;
grant execute on function public.record_accounting_sale(text,text,integer,text,uuid,date,text,text,text) to service_role;
revoke all on function public.record_accounting_movement(text,integer,date,uuid,uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.record_accounting_movement(text,integer,date,uuid,uuid,text,text,text,text) to service_role;
