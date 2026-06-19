-- Gate the profile-drift warning on OAuth signups only. For password (email-provider)
-- signups an absent name is expected, not Google-schema drift. Behavior is otherwise
-- unchanged: display_name/avatar_url stay null for password users.
create or replace function auth_hooks.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  name text := auth_hooks.sanitize_meta_name(new.raw_user_meta_data);
  avatar text := auth_hooks.sanitize_meta_avatar(new.raw_user_meta_data);
begin
  -- Drift detection: log present keys (keys only, never values) if expected name is
  -- absent — but only for non-email providers, where an absent name signals schema drift.
  if name is null and (new.raw_app_meta_data ->> 'provider') is distinct from 'email' then
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
