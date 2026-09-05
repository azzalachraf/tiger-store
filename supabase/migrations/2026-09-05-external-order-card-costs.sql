-- External Snapchat sales use the same configurable card costs as normal sales.
-- Values are resolved by the trusted server from finance_settings and written
-- atomically with the order, commission, finance row and warranty certificate.

create or replace function public.create_external_snapchat_sale_v2(
  p_admin_telegram_user_id bigint,
  p_order_id text,
  p_product_item jsonb,
  p_plan_months smallint,
  p_total integer,
  p_commission integer,
  p_card_type text,
  p_card_cost_usd_cents integer,
  p_card_cost_dzd integer,
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
    or p_card_type is null
    or p_card_type not in ('try_24','inr_100','try_115','try_229','inr_199')
    or p_card_cost_usd_cents is null or p_card_cost_usd_cents < 0
    or p_card_cost_dzd is null or p_card_cost_dzd < 0
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
    p_order_id, null, p_admin_telegram_user_id, p_plan_months, p_card_type,
    p_total, p_commission, p_card_cost_usd_cents, p_card_cost_dzd,
    p_total - p_commission - p_card_cost_dzd, 'external'
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
    jsonb_build_object(
      'certificate_id', certificate_id,
      'plan_months', p_plan_months,
      'card_type', p_card_type,
      'card_cost_dzd', p_card_cost_dzd
    )
  );

  return certificate_id;
end;
$$;

revoke all on function public.create_external_snapchat_sale_v2(
  bigint,text,jsonb,smallint,integer,integer,text,integer,integer,
  text,text,text,integer,timestamptz
) from public, anon, authenticated;
grant execute on function public.create_external_snapchat_sale_v2(
  bigint,text,jsonb,smallint,integer,integer,text,integer,integer,
  text,text,text,integer,timestamptz
) to service_role;

-- Repair external rows created by the previous zero-cost implementation.
with finance_config as (
  select
    usd_dzd_rate,
    card_costs_usd_cents
  from public.finance_settings
  where id = 'main'
), resolved as (
  select
    sale.order_id,
    case sale.plan_months
      when 1 then 'try_24'
      when 2 then 'inr_100'
      when 3 then 'try_115'
      when 6 then 'try_229'
      when 12 then 'inr_199'
    end as card_type,
    case sale.plan_months
      when 1 then coalesce((config.card_costs_usd_cents->>'try_24')::integer, 54)
      when 2 then coalesce((config.card_costs_usd_cents->>'inr_100')::integer, 115)
      when 3 then coalesce((config.card_costs_usd_cents->>'try_115')::integer, 260)
      when 6 then coalesce((config.card_costs_usd_cents->>'try_229')::integer, 500)
      when 12 then coalesce((config.card_costs_usd_cents->>'inr_199')::integer, 215)
    end as cost_usd_cents,
    config.usd_dzd_rate
  from public.finance_sales sale
  cross join finance_config config
  where sale.sale_source = 'external'
    and sale.card_type = 'external'
)
update public.finance_sales sale
set
  card_type = resolved.card_type,
  card_cost_usd_cents = resolved.cost_usd_cents,
  card_cost_dzd = floor(resolved.cost_usd_cents * resolved.usd_dzd_rate / 100.0)::integer,
  gross_profit_dzd = sale.revenue_dzd - sale.commission_dzd
    - floor(resolved.cost_usd_cents * resolved.usd_dzd_rate / 100.0)::integer
from resolved
where sale.order_id = resolved.order_id;
