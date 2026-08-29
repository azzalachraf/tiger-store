-- Owner analytics and complete product persistence. All monetary fields are integers.
alter table public.advertising_spend add column if not exists amount_usd_cents integer;
alter table public.advertising_spend add column if not exists source_id text not null default 'instagram';
update public.advertising_spend set amount_usd_cents = floor(amount_dzd * 100 / 250) where amount_usd_cents is null;
alter table public.advertising_spend alter column amount_usd_cents set not null;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'advertising_spend_usd_cents_check'
  ) then
    alter table public.advertising_spend
      add constraint advertising_spend_usd_cents_check check (amount_usd_cents >= 0);
  end if;
end $$;
create index if not exists advertising_spend_source_date_idx on public.advertising_spend(source_id, spend_date desc);

alter table public.products add column if not exists details jsonb;
alter table public.products add column if not exists faqs jsonb;

create table if not exists public.daily_owner_reports (
  report_date date primary key,
  sent_at timestamptz not null default now(),
  summary jsonb not null
);
alter table public.daily_owner_reports enable row level security;
revoke all on public.daily_owner_reports from anon, authenticated;

insert into public.business_settings (key, value)
values ('advertising_sources', '[{"id":"instagram","label":"Instagram @tigerr_store_dz"}]'::jsonb)
on conflict (key) do nothing;
