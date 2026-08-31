-- Tiger New Sheet tracks warranty-linked orders that have not yet been copied
-- to the owner's manual Google Sheet. This is private operational metadata.

create table if not exists public.order_sheet_exports (
  order_id text primary key references public.orders(id) on delete cascade,
  warranty_issued_at timestamptz not null default now(),
  copied_at timestamptz,
  created_at timestamptz not null default now(),
  check (copied_at is null or copied_at >= warranty_issued_at)
);

create index if not exists order_sheet_exports_uncopied_idx
  on public.order_sheet_exports (warranty_issued_at asc)
  where copied_at is null;

alter table public.order_sheet_exports enable row level security;
revoke all on public.order_sheet_exports from anon, authenticated;

create or replace function public.track_warranty_sheet_export()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_id is not null then
    insert into public.order_sheet_exports (order_id, warranty_issued_at)
    values (new.order_id, coalesce(new.created_at, now()))
    on conflict (order_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists warranty_certificates_track_sheet_export on public.warranty_certificates;
create trigger warranty_certificates_track_sheet_export
after insert on public.warranty_certificates
for each row execute function public.track_warranty_sheet_export();

-- Existing Telegram warranty certificates become available for the new sheet
-- once, without changing their certificate or customer data.
insert into public.order_sheet_exports (order_id, warranty_issued_at)
select order_id, coalesce(created_at, now())
from public.warranty_certificates
where order_id is not null
on conflict (order_id) do nothing;

revoke all on function public.track_warranty_sheet_export() from public, anon, authenticated;
