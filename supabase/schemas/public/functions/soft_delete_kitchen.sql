CREATE OR REPLACE FUNCTION public.soft_delete_kitchen (
  kitchen_id uuid
)
  RETURNS public.kitchens
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
  update public.kitchens
     set deleted_at = now()
   where id = kitchen_id and deleted_at is null
  returning *;
$function$;
