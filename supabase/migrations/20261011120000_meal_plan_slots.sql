create type public.meal_type as enum ('breakfast', 'lunch', 'dinner');

create table public.meal_plan_slots (
  id uuid primary key default gen_random_uuid(),
  kitchen_id uuid not null references public.kitchens (id) on delete cascade,
  date date not null,
  meal_type public.meal_type not null,
  recipe_id uuid not null references public.recipes (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kitchen_id, date, meal_type, recipe_id)
);

create index on public.meal_plan_slots (recipe_id);

create trigger meal_plan_slots_set_timestamps before insert or update on public.meal_plan_slots
  for each row execute procedure auth_hooks.set_timestamps();

alter table public.meal_plan_slots enable row level security;

revoke all on public.meal_plan_slots from anon, authenticated;
grant select, insert, delete on public.meal_plan_slots to authenticated;

-- Kitchen-owned tables gate on this: kitchens RLS owns "whose", the view owns "live".
create view public.live_kitchens with (security_invoker = true) as
  select * from public.kitchens where deleted_at is null;
revoke all on public.live_kitchens from anon, authenticated;
grant select on public.live_kitchens to authenticated;

create function auth_hooks.meal_plan_slots_enforce_recipe_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.kitchen_id::text, 0));
  if (
    select count(*) from public.meal_plan_slots
    where kitchen_id = new.kitchen_id and date = new.date and meal_type = new.meal_type
  ) > 20 then
    raise exception 'a meal holds at most 20 recipes' using errcode = 'check_violation';
  end if;
  return null;
end
$$;
revoke execute on function auth_hooks.meal_plan_slots_enforce_recipe_limit() from public, anon, authenticated;

create trigger meal_plan_slots_enforce_recipe_limit after insert on public.meal_plan_slots
  for each row execute procedure auth_hooks.meal_plan_slots_enforce_recipe_limit();

create policy "meal_plan_slots_select_own" on public.meal_plan_slots
  for select to authenticated using (kitchen_id in (select id from public.live_kitchens));
create policy "meal_plan_slots_insert_own" on public.meal_plan_slots
  for insert to authenticated with check (
    kitchen_id in (select id from public.live_kitchens)
    -- Not a CHECK, so rows age out and stay valid. Covers the current week + 25 future weeks,
    -- with a day of slack for the browser's local date differing from UTC.
    and date between current_date - 7 and current_date + 182
  );
create policy "meal_plan_slots_delete_own" on public.meal_plan_slots
  for delete to authenticated using (kitchen_id in (select id from public.live_kitchens));
