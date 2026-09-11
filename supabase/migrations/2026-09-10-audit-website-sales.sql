begin;
alter table public.snapchat_operations add column if not exists website_order_id text references public.orders(id) on delete set null;
create unique index if not exists active_website_operation on public.snapchat_operations(website_order_id) where website_order_id is not null and status in ('active','completed');

create or replace function public.claim_website_card(p_order text,p_admin bigint,p_plan smallint,p_card text)
returns table(operation_id uuid,card_id uuid,code_ciphertext text)
language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; r record;
begin
  select * into o from public.orders where id=p_order and status='pending' for update;
  if not found or jsonb_array_length(o.products)<>1 or (o.products->0->>'quantity')::int<>1 or o.products->0->>'slug'<>'snapchat-plus' then raise exception 'Order requires item-level fulfillment'; end if;
  if exists(select 1 from public.snapchat_operations where website_order_id=p_order and status in ('active','completed')) then raise exception 'Order already assigned'; end if;
  select * into r from public.claim_snapchat_redeem_card(p_admin,p_plan,p_card);
  update public.snapchat_operations set website_order_id=p_order where id=r.operation_id;
  return query select r.operation_id::uuid,r.card_id::uuid,r.code_ciphertext::text;
end $$;

create or replace function public.complete_website_sale(p_operation uuid,p_admin bigint,p_order text,p_credit integer,p_cost_usd integer,p_cost integer,p_code text,p_hash text,p_hint text,p_days integer,p_end timestamptz,p_warning boolean)
returns boolean language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; op public.snapchat_operations%rowtype;
begin
  select * into o from public.orders where id=p_order and status='pending' for update;
  if not found or jsonb_array_length(o.products)<>1 or (o.products->0->>'quantity')::int<>1 then raise exception 'Order unavailable'; end if;
  select * into op from public.snapchat_operations where id=p_operation and website_order_id=p_order and admin_telegram_user_id=p_admin and status='active' for update;
  if not found or p_credit<0 or p_cost<0 or p_cost_usd<0 or p_days<1 or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid fulfillment'; end if;
  update public.snapchat_operations set status='completed',completed_at=now() where id=op.id;
  update public.redeem_cards set status='consumed',consumed_at=now() where id=op.redeem_card_id;
  update public.orders set status='delivered' where id=o.id;
  insert into public.commissions(order_id,recipient_telegram_user_id,amount_dzd,status,note,created_by_telegram_user_id)
    values(o.id,p_admin,p_credit,'pending','Website fulfillment credit.',p_admin);
  insert into public.finance_sales(order_id,operation_id,admin_telegram_user_id,plan_months,card_type,revenue_dzd,commission_dzd,card_cost_usd_cents,card_cost_dzd,gross_profit_dzd)
    values(o.id,op.id,p_admin,op.plan_months,op.card_type,o.total,p_credit,p_cost_usd,p_cost,o.total-p_credit-p_cost);
  insert into public.warranty_certificates(operation_id,order_id,product_id,option_id,certificate_code,recipient_name,covered_days,starts_at,ends_at,status,issued_by_telegram_user_id,public_token_hash,public_token_hint,balance_warning_required)
    values(op.id,o.id,o.products->0->>'productId',o.products->0->>'optionId',p_code,'',p_days,now(),p_end,'active',p_admin,p_hash,p_hint,p_warning);
  return true;
end $$;
revoke all on function public.claim_website_card(text,bigint,smallint,text),public.complete_website_sale(uuid,bigint,text,integer,integer,integer,text,text,text,integer,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.claim_website_card(text,bigint,smallint,text),public.complete_website_sale(uuid,bigint,text,integer,integer,integer,text,text,text,integer,timestamptz,boolean) to service_role;
commit;
