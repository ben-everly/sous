SET local check_function_bodies = off;

DROP TRIGGER "on_auth_user_created" ON "auth"."users";

DROP TRIGGER "kitchens_enforce_owner_limit" ON "public"."kitchens";

DROP TRIGGER "kitchens_set_timestamps" ON "public"."kitchens";

DROP TRIGGER "meal_plan_slots_enforce_kitchen_limits" ON "public"."meal_plan_slots";

DROP TRIGGER "meal_plan_slots_set_timestamps" ON "public"."meal_plan_slots";

DROP TRIGGER "profiles_set_timestamps" ON "public"."profiles";

DROP TRIGGER "recipes_set_timestamps_on_insert" ON "public"."recipes";

DROP TRIGGER "recipes_set_timestamps_on_update" ON "public"."recipes";

DROP FUNCTION "auth_hooks"."handle_new_user"();

DROP FUNCTION "auth_hooks"."kitchens_enforce_owner_limit"();

DROP FUNCTION "auth_hooks"."meal_plan_slots_enforce_kitchen_limits"();

DROP FUNCTION "auth_hooks"."sanitize_meta_avatar"(jsonb);

DROP FUNCTION "auth_hooks"."sanitize_meta_name"(jsonb);

DROP FUNCTION "auth_hooks"."set_timestamps"();

DROP SCHEMA "auth_hooks";

CREATE SCHEMA "internal";

CREATE OR REPLACE FUNCTION internal.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  name text := internal.sanitize_meta_name(new.raw_user_meta_data);
  avatar text := internal.sanitize_meta_avatar(new.raw_user_meta_data);
begin
  if name is null and (new.raw_app_meta_data ->> 'provider') is distinct from 'email' then
    raise log 'handle_new_user: expected name keys absent, meta keys present: %',
      (select array_agg(k order by k)
         from jsonb_object_keys(coalesce(new.raw_user_meta_data, '{}'::jsonb)) k);
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, name, avatar);

  insert into public.kitchens (owner_id) values (new.id);

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION internal.kitchens_enforce_owner_limit()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));
  if (select count(*) from public.kitchens where owner_id = new.owner_id) > 10 then
    raise exception 'a user owns at most 10 kitchens' using errcode = 'SC001';
  end if;
  return null;
end
$function$;

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

CREATE OR REPLACE FUNCTION internal.sanitize_meta_avatar (
  meta jsonb
)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select case when raw ~* '^https://' then raw end
  from (select coalesce(meta ->> 'avatar_url', meta ->> 'picture') as raw) s;
$function$;

CREATE OR REPLACE FUNCTION internal.sanitize_meta_name (
  meta jsonb
)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select nullif(btrim(left(regexp_replace(
    coalesce(meta ->> 'full_name', meta ->> 'name', ''),
    '[[:cntrl:]]', '', 'g'), 200)), '');
$function$;

CREATE OR REPLACE FUNCTION internal.set_timestamps()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.created_at = case when tg_op = 'INSERT' then now() else old.created_at end;
  new.updated_at = now();
  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION internal.handle_new_user();

CREATE TRIGGER kitchens_enforce_owner_limit
  AFTER INSERT ON public.kitchens
  FOR EACH ROW
  EXECUTE FUNCTION internal.kitchens_enforce_owner_limit();

CREATE TRIGGER kitchens_set_timestamps
  BEFORE INSERT OR UPDATE ON public.kitchens
  FOR EACH ROW
  EXECUTE FUNCTION internal.set_timestamps();

CREATE TRIGGER meal_plan_slots_enforce_kitchen_limits
  AFTER INSERT ON public.meal_plan_slots
  FOR EACH ROW
  EXECUTE FUNCTION internal.meal_plan_slots_enforce_kitchen_limits();

CREATE TRIGGER meal_plan_slots_set_timestamps
  BEFORE INSERT OR UPDATE ON public.meal_plan_slots
  FOR EACH ROW
  EXECUTE FUNCTION internal.set_timestamps();

CREATE TRIGGER profiles_set_timestamps
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION internal.set_timestamps();

CREATE TRIGGER recipes_set_timestamps_on_insert
  BEFORE INSERT ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION internal.set_timestamps();

CREATE TRIGGER recipes_set_timestamps_on_update
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  WHEN ((old.* IS DISTINCT FROM new.*))
  EXECUTE FUNCTION internal.set_timestamps();

REVOKE ALL ON FUNCTION "internal"."handle_new_user"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "internal"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "internal"."handle_new_user"() TO "postgres";

REVOKE ALL ON FUNCTION "internal"."kitchens_enforce_owner_limit"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "internal"."kitchens_enforce_owner_limit"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "internal"."kitchens_enforce_owner_limit"() TO "postgres";

REVOKE ALL ON FUNCTION "internal"."meal_plan_slots_enforce_kitchen_limits"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "internal"."meal_plan_slots_enforce_kitchen_limits"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "internal"."meal_plan_slots_enforce_kitchen_limits"() TO "postgres";

REVOKE ALL ON FUNCTION "internal"."sanitize_meta_avatar"(jsonb) FROM PUBLIC;

REVOKE ALL ON FUNCTION "internal"."sanitize_meta_avatar"(jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "internal"."sanitize_meta_avatar"(jsonb) TO "postgres";

REVOKE ALL ON FUNCTION "internal"."sanitize_meta_name"(jsonb) FROM PUBLIC;

REVOKE ALL ON FUNCTION "internal"."sanitize_meta_name"(jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "internal"."sanitize_meta_name"(jsonb) TO "postgres";

REVOKE ALL ON FUNCTION "internal"."set_timestamps"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "internal"."set_timestamps"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "internal"."set_timestamps"() TO "postgres";
