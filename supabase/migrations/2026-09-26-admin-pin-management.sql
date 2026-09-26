-- Store the administrator security PIN as a one-way scrypt hash after the
-- owner changes it in the dashboard. Until then, ADMIN_SECURITY_PIN remains
-- the bootstrap value. The version invalidates every existing PIN unlock.

create table if not exists public.admin_security_settings (
  id text primary key check (id = 'main'),
  pin_hash text not null,
  pin_version uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);

alter table public.admin_security_settings enable row level security;
revoke all on public.admin_security_settings from anon, authenticated;
