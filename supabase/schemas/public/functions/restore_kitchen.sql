CREATE OR REPLACE FUNCTION public.restore_kitchen (
  kitchen_id uuid
)
  RETURNS public.kitchens
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
  update public.kitchens
     set deleted_at = null
   where id = kitchen_id and deleted_at is not null
  returning *;
$function$;
