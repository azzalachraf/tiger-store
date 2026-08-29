create table if not exists public.telegram_redeem_upload_sessions (
  telegram_user_id bigint primary key references public.telegram_users(telegram_user_id) on delete cascade,
  card_type text not null check (card_type in ('try_24', 'try_48', 'inr_100', 'try_115', 'try_229', 'inr_199', 'inr_298')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.telegram_redeem_upload_sessions enable row level security;
revoke all on table public.telegram_redeem_upload_sessions from anon, authenticated;

drop trigger if exists telegram_redeem_upload_sessions_set_updated_at on public.telegram_redeem_upload_sessions;
create trigger telegram_redeem_upload_sessions_set_updated_at
before update on public.telegram_redeem_upload_sessions
for each row execute function public.set_updated_at();
