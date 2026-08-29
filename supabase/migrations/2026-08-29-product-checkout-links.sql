-- Short, revocable product-payment links. The target still resolves against
-- the current server-side catalog, so no client supplied price is persisted.
create table if not exists public.product_checkout_links (
  token text primary key check (token ~ '^[A-Za-z0-9_-]{10,32}$'),
  product_slug text not null check (product_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  option_id text not null check (option_id ~ '^[A-Za-z0-9:_-]{1,160}$'),
  created_at timestamptz not null default now()
);

create index if not exists product_checkout_links_created_at_idx
  on public.product_checkout_links (created_at desc);

alter table public.product_checkout_links enable row level security;
revoke all on public.product_checkout_links from anon, authenticated;
