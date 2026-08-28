-- Completes a Snapchat card operation, creates its delivered order and creates
-- one durable, single-use warranty form. Apply after the operations migrations.

alter table public.warranty_certificates add column if not exists operation_id uuid references public.snapchat_operations(id) on delete restrict;
alter table public.warranty_certificates add column if not exists public_token_hash text;
alter table public.warranty_certificates add column if not exists public_token_hint text;
alter table public.warranty_certificates add column if not exists customer_username text;
alter table public.warranty_certificates add column if not exists activation_platform text;
alter table public.warranty_certificates add column if not exists customer_phone text;
alter table public.warranty_certificates add column if not exists customer_email text;
alter table public.warranty_certificates add column if not exists customer_details_complete boolean not null default false;
alter table public.warranty_certificates add column if not exists form_submitted_at timestamptz;
alter table public.warranty_certificates add column if not exists balance_warning_required boolean not null default false;
alter table public.warranty_certificates add column if not exists balance_warning_acknowledged_at timestamptz;
create unique index if not exists warranty_certificates_operation_key on public.warranty_certificates(operation_id) where operation_id is not null;
create unique index if not exists warranty_certificates_token_hash_key on public.warranty_certificates(public_token_hash) where public_token_hash is not null;

create or replace function public.complete_snapchat_operation_sale(
  p_operation_id uuid, p_admin_telegram_user_id bigint, p_order_id text,
  p_product_item jsonb, p_total integer, p_certificate_code text,
  p_token_hash text, p_token_hint text, p_covered_days integer,
  p_ends_at timestamptz, p_balance_warning_required boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare operation_row public.snapchat_operations%rowtype;
declare certificate_id uuid;
begin
  select * into operation_row from public.snapchat_operations
    where id = p_operation_id and admin_telegram_user_id = p_admin_telegram_user_id and status = 'active' for update;
  if not found then raise exception 'Operation unavailable'; end if;
  if p_total < 1 or p_covered_days < 1 or p_certificate_code !~ '^[A-Z0-9-]{6,80}$' or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid sale'; end if;
  update public.snapchat_operations set status = 'completed', completed_at = now() where id = operation_row.id;
  update public.redeem_cards set status = 'consumed', consumed_at = now() where id = operation_row.redeem_card_id;
  insert into public.orders (id, "customerName", phone, email, products, "paymentMethod", total, notes, status, "createdAt", "adminNotes")
  values (p_order_id, 'Customer details incomplete', 'incomplete', '', jsonb_build_array(p_product_item), 'Telegram', p_total, 'Telegram Snapchat sale. Customer warranty details incomplete.', 'delivered', now()::text, 'Created from a completed Telegram Snapchat operation.');
  insert into public.commissions (order_id, recipient_telegram_user_id, amount_dzd, status, note, created_by_telegram_user_id)
  values (p_order_id, p_admin_telegram_user_id, 0, 'pending', 'Commission amount must be recorded by the owner.', p_admin_telegram_user_id);
  insert into public.warranty_certificates (operation_id, order_id, product_id, option_id, certificate_code, recipient_name, covered_days, starts_at, ends_at, status, issued_by_telegram_user_id, public_token_hash, public_token_hint, balance_warning_required)
  values (operation_row.id, p_order_id, 'snapchat-plus', p_product_item->>'optionId', p_certificate_code, '', p_covered_days, now(), p_ends_at, 'active', p_admin_telegram_user_id, p_token_hash, p_token_hint, p_balance_warning_required)
  returning id into certificate_id;
  insert into public.operation_events (actor_telegram_user_id, entity_type, entity_id, action, metadata)
  values (p_admin_telegram_user_id, 'order', p_order_id, 'snapchat_operation_completed_sale_created', jsonb_build_object('operation_id', operation_row.id, 'certificate_id', certificate_id));
  return certificate_id;
end;
$$;

create or replace function public.submit_snapchat_warranty_form(
  p_token_hash text, p_name text, p_username text, p_platform text, p_phone text, p_email text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare certificate_row public.warranty_certificates%rowtype;
begin
  select * into certificate_row from public.warranty_certificates where public_token_hash = p_token_hash and form_submitted_at is null for update;
  if not found then raise exception 'Form unavailable'; end if;
  update public.warranty_certificates set recipient_name = p_name, customer_username = p_username, activation_platform = p_platform, customer_phone = p_phone, customer_email = p_email, customer_details_complete = true, form_submitted_at = now(), status = 'claimed' where id = certificate_row.id;
  update public.orders set "customerName" = p_name, phone = p_phone, email = p_email, notes = coalesce(notes, '') || ' Warranty form submitted.' where id = certificate_row.order_id;
  insert into public.operation_events (entity_type, entity_id, action, metadata) values ('warranty', certificate_row.id::text, 'snapchat_warranty_form_submitted', '{}'::jsonb);
  return certificate_row.id;
end;
$$;

create or replace function public.acknowledge_snapchat_balance_warning(p_token_hash text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.warranty_certificates set balance_warning_acknowledged_at = now()
    where public_token_hash = p_token_hash and customer_details_complete and balance_warning_required and balance_warning_acknowledged_at is null;
  return found;
end;
$$;

revoke all on function public.complete_snapchat_operation_sale(uuid, bigint, text, jsonb, integer, text, text, text, integer, timestamptz, boolean), public.submit_snapchat_warranty_form(text, text, text, text, text, text), public.acknowledge_snapchat_balance_warning(text) from public, anon, authenticated;
grant execute on function public.complete_snapchat_operation_sale(uuid, bigint, text, jsonb, integer, text, text, text, integer, timestamptz, boolean), public.submit_snapchat_warranty_form(text, text, text, text, text, text), public.acknowledge_snapchat_balance_warning(text) to service_role;
