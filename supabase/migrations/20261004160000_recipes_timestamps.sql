alter table public.recipes
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

grant select (created_at, updated_at) on public.recipes to anon, authenticated;

create trigger recipes_set_timestamps_on_insert before insert on public.recipes
  for each row execute procedure auth_hooks.set_timestamps();

create trigger recipes_set_timestamps_on_update before update on public.recipes
  for each row when (old.* is distinct from new.*)
  execute procedure auth_hooks.set_timestamps();
