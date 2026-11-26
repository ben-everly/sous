SET local check_function_bodies = off;

DROP TRIGGER "on_auth_user_created" ON "auth"."users";

DROP FUNCTION "internal"."handle_new_user"();

CREATE OR REPLACE FUNCTION internal.auth_users_handle_new()
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
    raise log 'auth_users_handle_new: expected name keys absent, meta keys present: %',
      (select array_agg(k order by k)
         from jsonb_object_keys(coalesce(new.raw_user_meta_data, '{}'::jsonb)) k);
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, name, avatar);

  insert into public.kitchens (owner_id) values (new.id);

  return new;
end;
$function$;

CREATE TRIGGER auth_users_handle_new
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION internal.auth_users_handle_new();

REVOKE ALL ON FUNCTION "internal"."auth_users_handle_new"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "internal"."auth_users_handle_new"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "internal"."auth_users_handle_new"() TO "postgres";
