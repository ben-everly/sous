CREATE OR REPLACE FUNCTION auth_hooks.meal_plan_slots_enforce_recipe_limit()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;
