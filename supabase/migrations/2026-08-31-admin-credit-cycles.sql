-- A full payment closes an administrator's visible sales/credit cycle. Partial
-- payments remain recorded but do not reset the administrator's statistics.
alter table public.admin_payments
  add column if not exists settles_cycle boolean not null default false;

create index if not exists admin_payments_cycle_settlement_idx
  on public.admin_payments (admin_telegram_user_id, paid_at desc)
  where settles_cycle = true;

-- Snapchat commission is a fixed 100 DA for every plan and every existing
-- Telegram operation sale. Website orders remain outside finance_sales.
update public.finance_settings
set snapchat_plans = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(snapchat_plans, '{1,commission_dzd}', '100'::jsonb, true),
        '{2,commission_dzd}', '100'::jsonb, true),
      '{3,commission_dzd}', '100'::jsonb, true),
    '{6,commission_dzd}', '100'::jsonb, true),
  '{12,commission_dzd}', '100'::jsonb, true),
updated_at = now()
where id = 'main';

update public.finance_sales
set commission_dzd = 100,
    gross_profit_dzd = revenue_dzd - 100 - card_cost_dzd
where commission_dzd <> 100;

update public.commissions as commission
set amount_dzd = 100
where exists (
  select 1 from public.finance_sales as sale where sale.order_id = commission.order_id
) and commission.amount_dzd <> 100;
