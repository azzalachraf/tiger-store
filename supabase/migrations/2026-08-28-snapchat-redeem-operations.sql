-- Snapchat redeem-card operations. Apply after 2026-08-28-operations-foundation.sql.
-- Codes are encrypted before reaching this database. The database only ever
-- returns one code through the atomic claim function below.

create table if not exists public.redeem_cards (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  code_ciphertext text not null,
  card_type text not null check (card_type in ('try_24', 'try_48', 'inr_100', 'try_115', 'try_229', 'inr_199', 'inr_298')),
  source_row_key text not null,
  source_available boolean not null default true,
  status text not null default 'available' check (status in ('available', 'reserved', 'consumed', 'disabled')),
  reserved_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists redeem_cards_available_idx on public.redeem_cards (card_type, created_at) where status = 'available';
create index if not exists redeem_cards_source_row_idx on public.redeem_cards (source_row_key);

create table if not exists public.snapchat_operations (
  id uuid primary key default gen_random_uuid(),
  admin_telegram_user_id bigint not null references public.telegram_users(telegram_user_id) on delete restrict,
  redeem_card_id uuid not null references public.redeem_cards(id) on delete restrict,
  plan_months smallint not null check (plan_months in (1, 2, 3, 6, 12)),
  card_type text not null check (card_type in ('try_24', 'try_48', 'inr_100', 'try_115', 'try_229', 'inr_199', 'inr_298')),
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (plan_months = 1 and card_type in ('try_24', 'try_48')) or
    (plan_months = 2 and card_type = 'inr_100') or
    (plan_months = 3 and card_type = 'try_115') or
    (plan_months = 6 and card_type = 'try_229') or
    (plan_months = 12 and card_type in ('inr_199', 'inr_298'))
  ),
  check ((status = 'active' and completed_at is null and cancelled_at is null) or status <> 'active')
);
create index if not exists snapchat_operations_admin_idx on public.snapchat_operations (admin_telegram_user_id, created_at desc);
create unique index if not exists snapchat_operations_active_card_idx on public.snapchat_operations (redeem_card_id) where status = 'active';

create table if not exists public.redeem_card_stock_alerts (
  card_type text primary key check (card_type in ('try_24', 'try_48', 'inr_100', 'try_115', 'try_229', 'inr_199', 'inr_298')),
  available_count integer not null check (available_count >= 0),
  last_notified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.redeem_cards enable row level security;
alter table public.snapchat_operations enable row level security;
alter table public.redeem_card_stock_alerts enable row level security;
revoke all on public.redeem_cards, public.snapchat_operations, public.redeem_card_stock_alerts from anon, authenticated;

drop trigger if exists redeem_cards_set_updated_at on public.redeem_cards;
create trigger redeem_cards_set_updated_at before update on public.redeem_cards for each row execute function public.set_updated_at();
drop trigger if exists snapchat_operations_set_updated_at on public.snapchat_operations;
create trigger snapchat_operations_set_updated_at before update on public.snapchat_operations for each row execute function public.set_updated_at();
drop trigger if exists redeem_card_stock_alerts_set_updated_at on public.redeem_card_stock_alerts;
create trigger redeem_card_stock_alerts_set_updated_at before update on public.redeem_card_stock_alerts for each row execute function public.set_updated_at();

create or replace function public.sync_redeem_card_from_sheet(
  p_code_hash text,
  p_code_ciphertext text,
  p_card_type text,
  p_source_row_key text,
  p_source_available boolean
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_card_type not in ('try_24', 'try_48', 'inr_100', 'try_115', 'try_229', 'inr_199', 'inr_298') then
    raise exception 'Invalid card type';
  end if;
  insert into public.redeem_cards (code_hash, code_ciphertext, card_type, source_row_key, source_available, status)
  values (p_code_hash, p_code_ciphertext, p_card_type, p_source_row_key, p_source_available, case when p_source_available then 'available' else 'disabled' end)
  on conflict (code_hash) do update set
    source_row_key = excluded.source_row_key,
    source_available = excluded.source_available,
    card_type = excluded.card_type,
    code_ciphertext = case when public.redeem_cards.status = 'available' then excluded.code_ciphertext else public.redeem_cards.code_ciphertext end,
    status = case
      when public.redeem_cards.status = 'available' and excluded.source_available then 'available'
      when public.redeem_cards.status = 'available' then 'disabled'
      else public.redeem_cards.status
    end,
    updated_at = now();
end;
$$;

create or replace function public.claim_snapchat_redeem_card(
  p_admin_telegram_user_id bigint,
  p_plan_months smallint,
  p_card_type text
) returns table(operation_id uuid, card_id uuid, code_ciphertext text)
language plpgsql security definer set search_path = public as $$
declare selected_card public.redeem_cards%rowtype;
declare new_operation_id uuid;
begin
  if not exists (select 1 from public.telegram_users where telegram_user_id = p_admin_telegram_user_id and role in ('owner', 'admin')) then
    raise exception 'Not authorised';
  end if;
  if not ((p_plan_months = 1 and p_card_type in ('try_24', 'try_48')) or (p_plan_months = 2 and p_card_type = 'inr_100') or (p_plan_months = 3 and p_card_type = 'try_115') or (p_plan_months = 6 and p_card_type = 'try_229') or (p_plan_months = 12 and p_card_type in ('inr_199', 'inr_298'))) then
    raise exception 'Invalid plan and card type';
  end if;
  select * into selected_card from public.redeem_cards
    where card_type = p_card_type and status = 'available' and source_available
    order by created_at
    for update skip locked limit 1;
  if not found then
    raise exception 'No code available';
  end if;
  update public.redeem_cards set status = 'reserved', reserved_at = now() where id = selected_card.id;
  insert into public.snapchat_operations (admin_telegram_user_id, redeem_card_id, plan_months, card_type)
  values (p_admin_telegram_user_id, selected_card.id, p_plan_months, p_card_type)
  returning id into new_operation_id;
  insert into public.operation_events (actor_telegram_user_id, entity_type, entity_id, action, metadata)
  values (p_admin_telegram_user_id, 'inventory', selected_card.id::text, 'snapchat_card_claimed', jsonb_build_object('operation_id', new_operation_id, 'card_type', p_card_type));
  return query select new_operation_id, selected_card.id, selected_card.code_ciphertext;
end;
$$;

create or replace function public.finish_snapchat_operation(
  p_operation_id uuid,
  p_admin_telegram_user_id bigint,
  p_outcome text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare operation_row public.snapchat_operations%rowtype;
begin
  if p_outcome not in ('completed', 'cancelled') then raise exception 'Invalid outcome'; end if;
  select * into operation_row from public.snapchat_operations
    where id = p_operation_id and admin_telegram_user_id = p_admin_telegram_user_id and status = 'active'
    for update;
  if not found then return false; end if;
  update public.snapchat_operations set status = p_outcome,
    completed_at = case when p_outcome = 'completed' then now() else null end,
    cancelled_at = case when p_outcome = 'cancelled' then now() else null end
    where id = operation_row.id;
  update public.redeem_cards set status = case when p_outcome = 'completed' then 'consumed' else 'available' end,
    consumed_at = case when p_outcome = 'completed' then now() else null end,
    reserved_at = case when p_outcome = 'completed' then reserved_at else null end
    where id = operation_row.redeem_card_id;
  insert into public.operation_events (actor_telegram_user_id, entity_type, entity_id, action, metadata)
  values (p_admin_telegram_user_id, 'inventory', operation_row.redeem_card_id::text, 'snapchat_operation_' || p_outcome, jsonb_build_object('operation_id', operation_row.id, 'card_type', operation_row.card_type));
  return true;
end;
$$;

revoke all on function public.sync_redeem_card_from_sheet(text, text, text, text, boolean), public.claim_snapchat_redeem_card(bigint, smallint, text), public.finish_snapchat_operation(uuid, bigint, text) from public, anon, authenticated;
