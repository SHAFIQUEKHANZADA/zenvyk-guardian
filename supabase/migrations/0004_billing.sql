-- ─────────────────────────────────────────────────────────────
-- Zenvyk Guardian — migration 0004
-- Stripe billing: subscriptions table + profiles.plan column.
-- ─────────────────────────────────────────────────────────────

-- PROFILES: current plan ───────────────────────────────────────
alter table public.profiles
  add column if not exists plan text not null default 'free';

-- SUBSCRIPTIONS ────────────────────────────────────────────────
create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text not null default 'free',
  status                 text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx
  on public.subscriptions (stripe_customer_id);
create index if not exists subscriptions_subscription_idx
  on public.subscriptions (stripe_subscription_id);

alter table public.subscriptions enable row level security;

-- Users can READ only their own subscription row. Writes happen server-side
-- via the service-role key (Stripe webhook), which bypasses RLS.
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);
