-- Private schema for security-definer trigger functions. Kept off the Data API by
-- omitting it from [api].schemas in config.toml.
create schema if not exists auth_hooks;
revoke all on schema auth_hooks from anon;

-- Per-user display info. Detail fields are intentionally nullable (lenient bootstrap).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 200),
  avatar_url text check (avatar_url is null or avatar_url ~* '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Bootstrap on signup. Fails loud (no exception block) by design.
create function auth_hooks.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  -- Sanitize the one attacker-controlled input.
  name text := nullif(btrim(left(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name', ''),
    '[[:cntrl:]]', '', 'g'), 200)), '');
  -- Lenient like the name: a bad value is dropped, never allowed to block signup.
  avatar_raw text := coalesce(new.raw_user_meta_data ->> 'avatar_url',
                              new.raw_user_meta_data ->> 'picture');
  avatar text := case when avatar_raw ~* '^https://' then avatar_raw end;
begin
  -- Drift detection: log present keys (keys only, never values) if expected name is absent.
  if name is null or name = '' then
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

-- updated_at maintenance. Plain security invoker (NOT definer): only touches the row
-- being updated.
create function auth_hooks.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute procedure auth_hooks.set_updated_at();
