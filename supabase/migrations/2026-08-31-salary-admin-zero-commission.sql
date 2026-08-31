-- Salary-based administrators do not reduce per-order net profit. Earlier
-- fixed-commission data may have stored 100 DA for these administrators, so
-- reconcile their finance and credit rows to zero.

with salary_admins as (
  select regexp_replace(key, '^admin_compensation_', '')::bigint as telegram_user_id
  from public.business_settings
  where key like 'admin_compensation_%'
    and value ->> 'mode' = 'salary'
), corrected_sales as (
  update public.finance_sales as sale
  set commission_dzd = 0,
      gross_profit_dzd = sale.revenue_dzd - sale.card_cost_dzd
  from salary_admins as admin
  where sale.admin_telegram_user_id = admin.telegram_user_id
    and sale.commission_dzd <> 0
  returning sale.order_id
)
update public.commissions as commission
set amount_dzd = 0,
    updated_at = now()
where commission.order_id in (select order_id from corrected_sales)
  and commission.amount_dzd <> 0;
