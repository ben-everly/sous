-- Kitchens: single-owner workspaces. CRUD runs through the browser client, so every
-- invariant lives here — owner-only RLS, the name CHECK, and the partial unique index.
create table public.kitchens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- Nullable: the bootstrapped/first kitchen has no name (UI renders a fallback).
  -- The CHECK forbids empty/whitespace-only names, so a stored name is always meaningful.
  name text check (name is null or (btrim(name) <> '' and char_length(name) <= 200)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clears the db:advisors unindexed-FK lint; serves every RLS check and the list query.
create index on public.kitchens (owner_id);

-- At most one unnamed ("My Kitchen") kitchen per owner; any extras must be named.
-- DB backstop behind the "first kitchen is nameless, rest are named" UX, and against
-- indistinguishable duplicates from a direct client insert.
create unique index kitchens_one_unnamed_per_owner
  on public.kitchens (owner_id) where name is null;

alter table public.kitchens enable row level security;

-- Full CRUD policies (unlike profiles, where only the trigger writes) — this is what
-- makes client-first CRUD safe. (select auth.uid()) is cached per-statement by the planner.
create policy "kitchens_select_own" on public.kitchens
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "kitchens_insert_own" on public.kitchens
  for insert to authenticated with check (owner_id = (select auth.uid()));
-- with check pins owner_id to the caller, so a client cannot transfer a kitchen away.
create policy "kitchens_update_own" on public.kitchens
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "kitchens_delete_own" on public.kitchens
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Reuses the auth-foundation trigger function (security invoker).
create trigger kitchens_set_updated_at before update on public.kitchens
  for each row execute procedure auth_hooks.set_updated_at();

-- No exception block by design: a kitchen-insert failure aborts signup rather than commit a
-- user with no kitchen. A brand-new user has zero kitchens, so the null name satisfies
-- kitchens_one_unnamed_per_owner.
create or replace function auth_hooks.handle_new_user()
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

  insert into public.kitchens (owner_id) values (new.id);

  return new;
end;
$$;
