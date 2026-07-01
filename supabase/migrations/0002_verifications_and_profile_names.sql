-- ─────────────────────────────────────────────────────────────
-- Zenvyk Guardian — migration 0002
-- 1) Add first/last name to profiles
-- 2) Store per-user verification runs (playground history + dashboard)
-- ─────────────────────────────────────────────────────────────

-- PROFILES: names ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text;

-- VERIFICATIONS ────────────────────────────────────────────────
create table if not exists public.verifications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  prompt           text not null,
  verdict          text not null,           -- PASS | FLAGGED | BLOCKED
  consensus_score  numeric,                 -- 0..1 or 0..100 (as backend returns)
  agreement_agree  integer,
  agreement_total  integer,
  response_ms      integer,
  model            text,                    -- primary/representative model
  created_at       timestamptz not null default now()
);

create index if not exists verifications_user_created_idx
  on public.verifications (user_id, created_at desc);

alter table public.verifications enable row level security;

-- Users can only see / create their own runs.
drop policy if exists "verifications_select_own" on public.verifications;
create policy "verifications_select_own"
  on public.verifications for select
  using (auth.uid() = user_id);

drop policy if exists "verifications_insert_own" on public.verifications;
create policy "verifications_insert_own"
  on public.verifications for insert
  with check (auth.uid() = user_id);

drop policy if exists "verifications_delete_own" on public.verifications;
create policy "verifications_delete_own"
  on public.verifications for delete
  using (auth.uid() = user_id);
