COMMENT ON SCHEMA "public" IS 'standard public schema';

-- Supabase's stock defaults expose every new public object to anon; revoke so anon gets only
-- explicit grants. authenticated keeps CRUD for RLS to gate, but not TRUNCATE (bypasses RLS) or
-- the other privileges PostgREST never uses. Schema-scoped defaults only add to the global ones,
-- which grant EXECUTE to PUBLIC, so that revoke is global.
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
