CREATE VIEW "public"."live_kitchens" WITH (security_invoker=true) AS  SELECT id,
    owner_id,
    name,
    created_at,
    updated_at,
    deleted_at
   FROM public.kitchens
  WHERE (deleted_at IS NULL);

REVOKE ALL ON TABLE "public"."live_kitchens" FROM "authenticated";

GRANT SELECT ON TABLE "public"."live_kitchens" TO "authenticated";
