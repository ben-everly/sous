-- Private schema for security-definer trigger functions. Kept off the Data API by
-- omitting it from [api].schemas in config.toml.
create schema if not exists auth_hooks;

-- Per-user display info. Detail fields are intentionally nullable (lenient bootstrap).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 200),
  avatar_url text check (avatar_url is null or avatar_url ~* '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- No insert/delete policy by design: handle_new_user is the only writer,
-- the auth.users cascade the only remover.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Sanitize attacker-controlled signup metadata. Pure transform, so security invoker
-- (not definer) and immutable.
create function auth_hooks.sanitize_meta_name(meta jsonb)
returns text language sql immutable set search_path = '' as $$
  select nullif(btrim(left(regexp_replace(
    coalesce(meta ->> 'full_name', meta ->> 'name', ''),
    '[[:cntrl:]]', '', 'g'), 200)), '');
$$;

-- Drop the avatar unless it's an https URL — a bad value never blocks signup.
create function auth_hooks.sanitize_meta_avatar(meta jsonb)
returns text language sql immutable set search_path = '' as $$
  select case when raw ~* '^https://' then raw end
  from (select coalesce(meta ->> 'avatar_url', meta ->> 'picture') as raw) s;
$$;

-- Bootstrap on signup. No exception block by design: a failed insert aborts the signup rather than orphan an auth.users row.
create function auth_hooks.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  name text := auth_hooks.sanitize_meta_name(new.raw_user_meta_data);
  avatar text := auth_hooks.sanitize_meta_avatar(new.raw_user_meta_data);
begin
  -- Drift detection: log present keys (keys only, never values) if expected name is absent.
  if name is null then
    raise log 'handle_new_user: expected name keys absent for %, meta keys present: %',
      new.id,
      (select array_agg(k order by k)
         from jsonb_object_keys(coalesce(new.raw_user_meta_data, '{}'::jsonb)) k);
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, name, avatar);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure auth_hooks.handle_new_user();

-- created_at/updated_at are forced here, never trusted from the client payload.
-- Plain security invoker (NOT definer): only touches the row being written.
create function auth_hooks.set_timestamps()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_at = case when tg_op = 'INSERT' then now() else old.created_at end;
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_set_timestamps before insert or update on public.profiles
  for each row execute procedure auth_hooks.set_timestamps();

revoke execute on all functions in schema auth_hooks from public;
