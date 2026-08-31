-- Warranty form details are private admin/order data. Keep the e-mail field
-- optional while persisting every submitted form value with its order.

create or replace function public.submit_snapchat_warranty_form(
  p_token_hash text, p_name text, p_username text, p_platform text, p_phone text, p_email text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare certificate_row public.warranty_certificates%rowtype;
begin
  select * into certificate_row
  from public.warranty_certificates
  where public_token_hash = p_token_hash and form_submitted_at is null
  for update;

  if not found then raise exception 'Form unavailable'; end if;
  if p_name is null or length(btrim(p_name)) < 2
    or p_username is null or length(btrim(p_username)) < 2
    or p_platform is null or p_platform not in ('Instagram', 'Snapchat', 'Facebook')
    or p_phone is null or length(btrim(p_phone)) < 6 then
    raise exception 'Invalid warranty details';
  end if;

  update public.warranty_certificates
  set recipient_name = btrim(p_name),
      customer_username = btrim(p_username),
      activation_platform = p_platform,
      customer_phone = btrim(p_phone),
      customer_email = nullif(btrim(coalesce(p_email, '')), ''),
      customer_details_complete = true,
      form_submitted_at = now(),
      status = 'claimed'
  where id = certificate_row.id;

  update public.orders
  set "customerName" = btrim(p_name),
      phone = btrim(p_phone),
      email = coalesce(nullif(btrim(coalesce(p_email, '')), ''), ''),
      notes = concat_ws(E'\n',
        nullif(notes, ''),
        format('Warranty form submitted. Username: %s. Activation platform: %s.', btrim(p_username), p_platform)
      )
  where id = certificate_row.order_id;

  insert into public.operation_events (entity_type, entity_id, action, metadata)
  values ('warranty', certificate_row.id::text, 'snapchat_warranty_form_submitted', '{}'::jsonb);
  return certificate_row.id;
end;
$$;

revoke all on function public.submit_snapchat_warranty_form(text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_snapchat_warranty_form(text, text, text, text, text, text)
  to service_role;
