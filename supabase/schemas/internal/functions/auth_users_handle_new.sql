-- No exception block: a failed insert must abort the signup, not leave a user without a profile
-- and kitchen. The drift log records key names only, never values or the user id.
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
