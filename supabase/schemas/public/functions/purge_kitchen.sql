CREATE OR REPLACE FUNCTION public.purge_kitchen (
  kitchen_id uuid
)
  RETURNS public.kitchens
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
  delete from public.kitchens
   where id = kitchen_id and deleted_at is not null
  returning *;
$function$;
