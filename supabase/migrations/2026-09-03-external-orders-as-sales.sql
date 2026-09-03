-- External Snapchat deliveries are real completed orders.  The database owns
-- the order, finance row, commission and single-use warranty link atomically.

alter table public.finance_sales
  add column if not exists sale_source text not null default 'redeem_card';

alter table public.finance_sales
  drop constraint if exists finance_sales_card_type_check;

alter table public.finance_sales
  add constraint finance_sales_card_type_check
  check (card_type in ('try_24','try_48','inr_100','try_115','try_229','inr_199','inr_298','external'));

alter table public.finance_sales
  drop constraint if exists finance_sales_sale_source_check;

alter table public.finance_sales
  add constraint finance_sales_sale_source_check
  check (sale_source in ('redeem_card', 'external'));

create or replace function public.create_external_snapchat_sale(
  p_admin_telegram_user_id bigint,
  p_order_id text,
  p_product_item jsonb,
  p_plan_months smallint,
  p_total integer,
  p_commission integer,
  p_certificate_code text,
  p_token_hash text,
  p_token_hint text,
  p_covered_days integer,
  p_ends_at timestamptz
) returns uuid
language plpgsql security definer set search_path = public as $$
declare certificate_id uuid;
begin
  if not exists (
    select 1 from public.telegram_users
    where telegram_user_id = p_admin_telegram_user_id
      and role in ('owner', 'admin')
  ) then
    raise exception 'Not authorised';
  end if;

  if p_order_id is null or p_order_id !~ '^TS-[A-Z0-9-]{6,80}$'
    or p_plan_months is null or p_plan_months not in (1, 2, 3, 6, 12)
    or p_total is null or p_total < 1
    or p_commission is null or p_commission < 0
    or p_covered_days is null or p_covered_days < 1
    or p_certificate_code !~ '^[A-Z0-9-]{6,80}$'
    or p_token_hash !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_product_item) <> 'object'
    or coalesce(p_product_item->>'productId', '') = ''
    or coalesce(p_product_item->>'optionId', '') = ''
    or p_ends_at is null or p_ends_at <= now() then
    raise exception 'Invalid external sale';
  end if;

  insert into public.orders (
    id, "customerName", phone, email, products, "paymentMethod", total,
    notes, status, "createdAt", "adminNotes"
  ) values (
    p_order_id, 'Customer details incomplete', 'incomplete', '',
    jsonb_build_array(p_product_item), 'Telegram', p_total,
    'External Snapchat sale. Customer warranty details incomplete.',
    'delivered', now()::text,
    'Created as a completed external order from Telegram.'
  );

  insert into public.commissions (
    order_id, recipient_telegram_user_id, amount_dzd, status, note,
    created_by_telegram_user_id
  ) values (
    p_order_id, p_admin_telegram_user_id, p_commission, 'pending',
    'External Snapchat order credit.', p_admin_telegram_user_id
  );

  insert into public.finance_sales (
    order_id, operation_id, admin_telegram_user_id, plan_months, card_type,
    revenue_dzd, commission_dzd, card_cost_usd_cents, card_cost_dzd,
    gross_profit_dzd, sale_source
  ) values (
    p_order_id, null, p_admin_telegram_user_id, p_plan_months, 'external',
    p_total, p_commission, 0, 0, p_total - p_commission, 'external'
  );

  insert into public.warranty_certificates (
    operation_id, order_id, product_id, option_id, certificate_code,
    recipient_name, covered_days, starts_at, ends_at, status,
    issued_by_telegram_user_id, public_token_hash, public_token_hint,
    balance_warning_required
  ) values (
    null, p_order_id, p_product_item->>'productId',
    p_product_item->>'optionId', p_certificate_code, '', p_covered_days,
    now(), p_ends_at, 'active', p_admin_telegram_user_id, p_token_hash,
    p_token_hint, false
  ) returning id into certificate_id;

  insert into public.operation_events (
    actor_telegram_user_id, entity_type, entity_id, action, metadata
  ) values (
    p_admin_telegram_user_id, 'order', p_order_id,
    'external_snapchat_sale_created',
    jsonb_build_object('certificate_id', certificate_id, 'plan_months', p_plan_months)
  );

  return certificate_id;
end;
$$;

revoke all on function public.create_external_snapchat_sale(
  bigint,text,jsonb,smallint,integer,integer,text,text,text,integer,timestamptz
) from public, anon, authenticated;
grant execute on function public.create_external_snapchat_sale(
  bigint,text,jsonb,smallint,integer,integer,text,text,text,integer,timestamptz
) to service_role;
