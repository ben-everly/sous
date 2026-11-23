CREATE OR REPLACE FUNCTION auth_hooks.sanitize_meta_name (
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
