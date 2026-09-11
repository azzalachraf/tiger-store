-- Additive security state. No existing business rows are changed or removed.
begin;
drop policy if exists "Service role upload product images" on storage.objects;
drop policy if exists "Service role update product images" on storage.objects;
drop policy if exists "Service role delete product images" on storage.objects;

-- NULL is deliberately conservative for historical cards of unknown provenance.
alter table public.redeem_cards add column if not exists redeemed_permanently boolean;
alter table public.redeem_cards alter column redeemed_permanently set default false;
create or replace function public.preserve_redeemed_card() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'DELETE' then
    if OLD.status = 'completed' then
      update public.redeem_cards set redeemed_permanently = true where id = OLD.redeem_card_id;
    end if;
    return OLD;
  end if;
  if NEW.status = 'completed' then
    update public.redeem_cards set redeemed_permanently = true where id = NEW.redeem_card_id;
  end if;
  return NEW;
end $$;
drop trigger if exists preserve_redeemed_card on public.snapchat_operations;
create trigger preserve_redeemed_card before update or delete on public.snapchat_operations
for each row execute function public.preserve_redeemed_card();
create or replace function public.prevent_redeemed_reuse() returns trigger
language plpgsql set search_path = public as $$
begin
  if OLD.redeemed_permanently is true and NEW.redeemed_permanently is distinct from true then
    raise exception 'Permanent redemption cannot be reversed';
  end if;
  if OLD.status = 'consumed' and NEW.status in ('available','reserved') and
    (OLD.redeemed_permanently is distinct from false or exists (
      select 1 from public.snapchat_operations where redeem_card_id = OLD.id and status = 'completed')) then
    raise exception 'Redeemed card cannot be restored';
  end if;
  return NEW;
end $$;
drop trigger if exists prevent_redeemed_reuse on public.redeem_cards;
create trigger prevent_redeemed_reuse before update on public.redeem_cards
for each row execute function public.prevent_redeemed_reuse();

create table if not exists public.legacy_warranty_claims (
  token_hash text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  recipient_name text not null,
  claimed_at timestamptz not null default now()
);
create table if not exists public.operation_requests (
  request_key text primary key,
  created_at timestamptz not null default now()
);
create table if not exists public.request_limits (
  key text primary key, window_start timestamptz not null, attempts integer not null
);
create table if not exists public.notification_jobs (
  id text primary key,
  order_id text references public.orders(id) on delete cascade,
  channel text not null check(channel in ('whatsapp','telegram','meta','daily')),
  sent_at timestamptz, attempts integer not null default 0,
  leased_until timestamptz, created_at timestamptz not null default now()
);
alter table public.legacy_warranty_claims enable row level security;
alter table public.operation_requests enable row level security;
alter table public.request_limits enable row level security;
alter table public.notification_jobs enable row level security;
revoke all on public.legacy_warranty_claims, public.operation_requests, public.request_limits, public.notification_jobs from public, anon, authenticated;
grant all on public.legacy_warranty_claims, public.operation_requests, public.request_limits, public.notification_jobs to service_role;

alter table public.orders add column if not exists gross_amount_dzd integer;
alter table public.orders add column if not exists request_key text;
create unique index if not exists orders_request_key_unique on public.orders(request_key) where request_key is not null;
alter table public.admin_payments add column if not exists request_key text;
create unique index if not exists payments_request_key_unique on public.admin_payments(request_key) where request_key is not null;

create or replace function public.take_request_limit(p_key text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if length(p_key) > 160 or p_limit < 1 or p_seconds < 1 then raise exception 'Invalid rate limit'; end if;
  insert into public.request_limits as r(key,window_start,attempts) values(p_key,now(),1)
  on conflict(key) do update set
    attempts = case when r.window_start < now()-make_interval(secs=>p_seconds) then 1 else r.attempts+1 end,
    window_start = case when r.window_start < now()-make_interval(secs=>p_seconds) then now() else r.window_start end
  returning attempts into n;
  return n <= p_limit;
end $$;

create or replace function public.record_admin_payment_atomic(p_admin bigint,p_amount integer,p_note text,p_key text,p_actor bigint default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare balance bigint; result uuid;
begin
  perform 1 from public.telegram_users where telegram_user_id=p_admin for update;
  if not found or length(p_key) not between 1 and 160 then raise exception 'Invalid payment'; end if;
  select id into result from public.admin_payments where request_key=p_key;
  if found then return result; end if;
  select coalesce((select sum(commission_dzd) from public.finance_sales where admin_telegram_user_id=p_admin),0)
    + coalesce((select sum(amount_dzd) from public.financial_adjustments where recipient_telegram_user_id=p_admin),0)
    - coalesce((select sum(amount_dzd) from public.admin_payments where admin_telegram_user_id=p_admin),0) into balance;
  if p_amount is null then p_amount := balance; end if;
  if p_amount < 1 or p_amount > balance then raise exception 'Payment exceeds credit'; end if;
  insert into public.admin_payments(admin_telegram_user_id,amount_dzd,note,request_key,recorded_by_telegram_user_id,settles_cycle)
  values(p_admin,p_amount,p_note,p_key,p_actor,p_amount=balance) returning id into result;
  return result;
end $$;

revoke all on function public.preserve_redeemed_card(),public.prevent_redeemed_reuse(),public.take_request_limit(text,integer,integer),public.record_admin_payment_atomic(bigint,integer,text,text,bigint) from public,anon,authenticated;
grant execute on function public.take_request_limit(text,integer,integer),public.record_admin_payment_atomic(bigint,integer,text,text,bigint) to service_role;
commit;
