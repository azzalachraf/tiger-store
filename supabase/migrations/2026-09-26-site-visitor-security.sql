-- Anonymous public-site device activity and IP bans. IP values are encrypted
-- by the application; only keyed hashes are used for lookups.

create table if not exists public.site_visitor_devices (
  id uuid primary key,
  session_id uuid not null,
  ip_hash text not null,
  ip_encrypted text not null,
  user_agent text not null default '',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_page text not null default '/',
  page_views integer not null default 1 check (page_views > 0)
);
create index if not exists site_visitor_devices_last_seen_idx on public.site_visitor_devices (last_seen_at desc);
create index if not exists site_visitor_devices_ip_idx on public.site_visitor_devices (ip_hash, last_seen_at desc);

create table if not exists public.site_ip_bans (
  ip_hash text primary key,
  ip_encrypted text not null,
  reason text not null default '',
  created_by_email text not null,
  banned_at timestamptz not null default now()
);

alter table public.site_visitor_devices enable row level security;
alter table public.site_ip_bans enable row level security;
revoke all on public.site_visitor_devices, public.site_ip_bans from anon, authenticated;
