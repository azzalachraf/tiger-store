-- Store an admin's chosen Telegram compliment form privately. Existing admins
-- remain nullable until the owner selects a form from Manage admins.
alter table public.telegram_users
  add column if not exists gender text check (gender in ('male', 'female'));

comment on column public.telegram_users.gender is
  'Private Telegram compliment form selected by the owner; never exposed publicly.';
