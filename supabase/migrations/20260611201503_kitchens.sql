create table public.kitchens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text check (name is null or (btrim(name) <> '' and char_length(name) <= 200)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.kitchens (owner_id);

create unique index kitchens_one_unnamed_per_owner
  on public.kitchens (owner_id) where name is null;

alter table public.kitchens enable row level security;

revoke all on public.kitchens from anon;

create policy "kitchens_select_own" on public.kitchens
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "kitchens_insert_own" on public.kitchens
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "kitchens_update_own" on public.kitchens
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "kitchens_delete_own" on public.kitchens
  for delete to authenticated using (owner_id = (select auth.uid()));

create trigger kitchens_set_timestamps before insert or update on public.kitchens
  for each row execute procedure auth_hooks.set_timestamps();

create or replace function auth_hooks.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  name text := auth_hooks.sanitize_meta_name(new.raw_user_meta_data);
  avatar text := auth_hooks.sanitize_meta_avatar(new.raw_user_meta_data);
begin
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
