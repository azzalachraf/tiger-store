begin;
alter table public.orders add column if not exists tracking_session_id uuid;
alter table public.daily_owner_reports add column if not exists sent_at timestamptz;
alter table public.daily_owner_reports alter column sent_at drop not null;
alter table public.daily_owner_reports alter column sent_at drop default;
alter table public.daily_owner_reports add column if not exists leased_until timestamptz;
alter table public.operation_requests add column if not exists state text not null default 'processing';
create table if not exists public.telegram_delivery_jobs (
  id uuid primary key default gen_random_uuid(), request_key text not null references public.operation_requests(request_key),
  payload_ciphertext text not null, sent_at timestamptz, created_at timestamptz not null default clock_timestamp()
);
alter table public.telegram_delivery_jobs enable row level security;
revoke all on public.telegram_delivery_jobs from public,anon,authenticated;
grant all on public.telegram_delivery_jobs to service_role;

create or replace function public.queue_checkout_notifications() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if NEW.request_key is null then return NEW; end if;
  insert into public.notification_jobs(id,order_id,channel) values(NEW.id||':whatsapp',NEW.id,'whatsapp'),(NEW.id||':telegram',NEW.id,'telegram'),(NEW.id||':meta',NEW.id,'meta') on conflict do nothing;
  insert into public.page_events(id,event_type,page_url,session_id,utm_source,utm_medium,utm_campaign)
    values('purchase:'||NEW.id,'purchase_completed','/checkout',NEW.tracking_session_id::text,NEW.utm_source,NEW.utm_medium,NEW.utm_campaign);
  return NEW;
end $$;
drop trigger if exists queue_checkout_notifications on public.orders;
create trigger queue_checkout_notifications after insert on public.orders for each row execute function public.queue_checkout_notifications();

create or replace function public.lease_notification_jobs() returns setof public.notification_jobs language sql security definer set search_path=public as $$
  update public.notification_jobs set leased_until=now()+interval '2 minutes',attempts=attempts+1
  where id in (select id from public.notification_jobs where sent_at is null and (leased_until is null or leased_until<now()) order by created_at,id limit 6 for update skip locked)
  returning *;
$$;
create or replace function public.lease_daily_report(p_day date,p_summary jsonb) returns boolean language plpgsql security definer set search_path=public as $$
begin
  insert into public.daily_owner_reports(report_date,summary) values(p_day,p_summary) on conflict do nothing;
  update public.daily_owner_reports set leased_until=now()+interval '2 minutes' where report_date=p_day and sent_at is null and (leased_until is null or leased_until<now());
  return found;
end $$;
revoke all on function public.queue_checkout_notifications(),public.lease_notification_jobs(),public.lease_daily_report(date,jsonb) from public,anon,authenticated;
grant execute on function public.lease_notification_jobs(),public.lease_daily_report(date,jsonb) to service_role;
commit;
