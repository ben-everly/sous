CREATE OR REPLACE FUNCTION internal.meal_plan_slots_enforce_kitchen_limits()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.kitchen_id::text, 0));
  if (
    select count(*) from public.meal_plan_slots
    where kitchen_id = new.kitchen_id and date = new.date
  ) > 100 then
    raise exception 'a day holds at most 100 meal plan slots' using errcode = 'SC003';
  end if;
  if (
    select count(*) from public.meal_plan_slots where kitchen_id = new.kitchen_id
  ) > 50000 then
    raise exception 'a kitchen holds at most 50000 meal plan slots' using errcode = 'SC002';
  end if;
  return null;
end
$function$;
