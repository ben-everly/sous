CREATE OR REPLACE FUNCTION auth_hooks.kitchens_enforce_owner_limit()
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
