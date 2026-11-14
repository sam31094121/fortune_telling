-- Shared-game cultivation only. No customer birth/profile data is stored here.
-- A single conditional UPDATE commits cards, growth, protection and receipt together.
create table public.beast_cultivation_accounts (
  owner_hash text primary key check (owner_hash ~ '^[a-f0-9]{64}$'),
  revision text not null check (revision ~ '^(0|[1-9][0-9]*)$'),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint beast_cultivation_revision_matches check (coalesce(snapshot->>'revision' = revision, false)),
  constraint beast_cultivation_state_exists check (
    coalesce(jsonb_typeof(snapshot->'state') = 'object'
    and jsonb_typeof(snapshot->'receipts') = 'array'
    and jsonb_typeof(snapshot->'state'->'cards') = 'array'
    and jsonb_typeof(snapshot->'state'->'protectedIds') = 'array', false)
  )
);
alter table public.beast_cultivation_accounts enable row level security;
revoke all on public.beast_cultivation_accounts from public, anon, authenticated;
grant select, insert, update, delete on public.beast_cultivation_accounts to service_role;
comment on table public.beast_cultivation_accounts is 'Server-only common beast cultivation; revision compare-and-swap protects concurrent material consumption.';
