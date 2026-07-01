-- ─────────────────────────────────────────────────────────────
-- Zenvyk Guardian — migration 0003
-- Populate profiles.first_name / last_name from signup metadata so the
-- name is available immediately (even before email confirmation).
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do update
    set email      = excluded.email,
        first_name = coalesce(excluded.first_name, public.profiles.first_name),
        last_name  = coalesce(excluded.last_name,  public.profiles.last_name);
  return new;
end;
$$;

-- Trigger already exists from migration 0001; re-create to be safe.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
