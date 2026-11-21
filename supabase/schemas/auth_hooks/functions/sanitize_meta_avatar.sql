CREATE OR REPLACE FUNCTION auth_hooks.sanitize_meta_avatar (
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
