begin;
-- Keep gross receipts and net revenue consistent without changing historical rows.
create or replace function public.normalize_order_receipt() returns trigger
language plpgsql set search_path = public as $$
declare months integer; standard integer; gross integer; quantity integer;
begin
  if NEW."paymentMethod" = 'Telegram' then return NEW; end if;
  if TG_OP='UPDATE' and NEW."paymentMethod" is not distinct from OLD."paymentMethod"
    and NEW.gross_amount_dzd is not distinct from OLD.gross_amount_dzd then return NEW; end if;
  gross := NEW.gross_amount_dzd;
  if TG_OP='UPDATE' and NEW."paymentMethod"='Flexy' and OLD."paymentMethod"<>'Flexy'
    and NEW.gross_amount_dzd is not distinct from OLD.gross_amount_dzd then gross := null; end if;
  if gross is null then
    gross := NEW.total;
    if NEW."paymentMethod"='Flexy' then
      select plan_months into months from public.finance_sales where order_id=NEW.id;
      if months is null and jsonb_array_length(NEW.products)=1 and NEW.products->0->>'slug'='snapchat-plus' then
        months := (regexp_match(coalesce(NEW.products->0->>'duration',NEW.products->0->>'option'),'(12|6|3|2|1)'))[1]::integer;
      end if;
      quantity := greatest(1,coalesce((NEW.products->0->>'quantity')::integer,1));
      select (snapchat_plans->months::text->>'price_dzd')::integer into standard from public.finance_settings where id='main';
      if standard * quantity = NEW.total then
        gross := (case months when 1 then 750 when 2 then 1000 when 3 then 1900 when 6 then 2400 when 12 then 2800 else gross end)*quantity;
      end if;
    end if;
  end if;
  NEW.gross_amount_dzd := gross;
  NEW.total := case when NEW."paymentMethod"='Flexy' then (gross::bigint*85/100)::integer else gross end;
  return NEW;
end $$;
drop trigger if exists normalize_order_receipt on public.orders;
create trigger normalize_order_receipt before insert or update on public.orders for each row execute function public.normalize_order_receipt();
create or replace function public.sync_order_finance_receipt() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.finance_sales set revenue_dzd=NEW.total,
    gross_profit_dzd=NEW.total-card_cost_dzd-commission_dzd where order_id=NEW.id;
  return NEW;
end $$;
drop trigger if exists sync_order_finance_receipt on public.orders;
create trigger sync_order_finance_receipt after update on public.orders for each row when (OLD.total is distinct from NEW.total) execute function public.sync_order_finance_receipt();

create or replace function public.submit_snapchat_warranty_form_v2(
 p_token_hash text,p_name text,p_username text,p_platform text,p_phone text,p_email text,p_payment_method text
) returns uuid language plpgsql security definer set search_path=public as $$
declare cert public.warranty_certificates%rowtype; result uuid;
begin
  select * into cert from public.warranty_certificates where public_token_hash=p_token_hash and form_submitted_at is null
    and status='active' for update;
  if not found or p_payment_method not in ('BaridiMob','Binance','RedotPay','Flexy') then raise exception 'Form unavailable'; end if;
  result := public.submit_snapchat_warranty_form(p_token_hash,p_name,p_username,p_platform,p_phone,p_email);
  update public.orders set "paymentMethod"=p_payment_method where id=cert.order_id;
  return result;
end $$;

create or replace function public.claim_legacy_warranty(p_hash text,p_order_id text,p_name text,p_phone text,p_email text,p_direct_order jsonb default null)
returns text language plpgsql security definer set search_path=public as $$
declare result text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_hash,0));
  select recipient_name into result from public.legacy_warranty_claims where token_hash=p_hash;
  if found then return result; end if;
  if p_hash !~ '^[a-f0-9]{64}$' or length(btrim(p_name)) < 2 or length(p_phone)<6 then raise exception 'Invalid claim'; end if;
  if p_direct_order is not null then
    insert into public.orders(id,"customerName",phone,email,products,"paymentMethod",total,notes,status,"createdAt","adminNotes")
    values(p_order_id,p_name,p_phone,p_email,p_direct_order->'products',p_direct_order->>'paymentMethod',
      (p_direct_order->>'total')::integer,p_direct_order->>'notes','delivered',p_direct_order->>'createdAt',p_direct_order->>'adminNotes')
    on conflict(id) do nothing;
  end if;
  perform 1 from public.orders where id=p_order_id and status='delivered' for update;
  if not found then raise exception 'Order unavailable'; end if;
  insert into public.legacy_warranty_claims(token_hash,order_id,recipient_name) values(p_hash,p_order_id,p_name);
  update public.orders set "customerName"=p_name,phone=p_phone,email=p_email where id=p_order_id;
  return p_name;
end $$;
revoke all on function public.normalize_order_receipt(),public.sync_order_finance_receipt(),public.submit_snapchat_warranty_form_v2(text,text,text,text,text,text,text),public.claim_legacy_warranty(text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.submit_snapchat_warranty_form_v2(text,text,text,text,text,text,text),public.claim_legacy_warranty(text,text,text,text,text,jsonb) to service_role;
commit;
