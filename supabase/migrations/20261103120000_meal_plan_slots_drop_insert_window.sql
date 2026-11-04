alter policy "meal_plan_slots_insert_own" on public.meal_plan_slots
  with check (kitchen_id in (select id from public.live_kitchens));

alter table public.meal_plan_slots
  add constraint meal_plan_slots_date_check check (date between '0001-01-01' and '9999-12-31');
