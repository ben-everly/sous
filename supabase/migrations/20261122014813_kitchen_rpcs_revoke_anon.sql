SET local check_function_bodies = off;

REVOKE ALL ON FUNCTION "public"."purge_kitchen"(uuid) FROM "anon";

REVOKE ALL ON FUNCTION "public"."restore_kitchen"(uuid) FROM "anon";

REVOKE ALL ON FUNCTION "public"."soft_delete_kitchen"(uuid) FROM "anon";
