-- Permanently removes one admin-selected fake order and the records derived
-- from that order. Redeem-card inventory is intentionally not re-opened: a
-- completed card may already have been revealed and must never be reissued.

create or replace function public.delete_order_permanently(p_order_id text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  linked_operation_id uuid;
  linked_certificate_ids text[] := array[]::text[];
begin
  if p_order_id is null or p_order_id !~ '^[A-Za-z0-9_-]{1,160}$' then
    raise exception 'Invalid order id';
  end if;

  perform 1 from public.orders where id = p_order_id for update;
  if not found then
    return false;
  end if;

  select operation_id into linked_operation_id
    from public.finance_sales
    where order_id = p_order_id;

  select coalesce(array_agg(id::text), array[]::text[]) into linked_certificate_ids
    from public.warranty_certificates
    where order_id = p_order_id;

  -- Remove every record derived from this order before its foreign-key parent.
  delete from public.operation_events
    where (entity_type = 'order' and entity_id = p_order_id)
       or (entity_type = 'warranty' and entity_id = any(linked_certificate_ids))
       or (linked_operation_id is not null and metadata ->> 'operation_id' = linked_operation_id::text);
  delete from public.financial_adjustments where order_id = p_order_id;
  delete from public.payment_records where order_id = p_order_id;
  delete from public.commissions where order_id = p_order_id;
  delete from public.inventory_assignments where order_id = p_order_id;
  delete from public.warranty_certificates where order_id = p_order_id;
  delete from public.finance_sales where order_id = p_order_id;

  if linked_operation_id is not null then
    delete from public.snapchat_operations where id = linked_operation_id;
  end if;

  delete from public.orders where id = p_order_id;
  return true;
end;
$$;

revoke all on function public.delete_order_permanently(text) from public, anon, authenticated;
grant execute on function public.delete_order_permanently(text) to service_role;
