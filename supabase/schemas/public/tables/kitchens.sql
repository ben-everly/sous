CREATE TABLE "public"."kitchens" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "owner_id"   uuid                     NOT NULL DEFAULT auth.uid(),
  "name"       text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted_at" timestamp with time zone,
  CONSTRAINT "kitchens_name_check" CHECK (((name IS NULL) OR ((btrim(name) <> ''::text) AND (char_length(name) <= 200)))),
  CONSTRAINT "kitchens_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "kitchens_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."kitchens"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER kitchens_enforce_owner_limit
  AFTER INSERT ON public.kitchens
  FOR EACH ROW
  EXECUTE FUNCTION auth_hooks.kitchens_enforce_owner_limit();

CREATE TRIGGER kitchens_set_timestamps
  BEFORE INSERT OR UPDATE ON public.kitchens
  FOR EACH ROW
  EXECUTE FUNCTION auth_hooks.set_timestamps();

CREATE UNIQUE INDEX kitchens_one_unnamed_per_owner ON public.kitchens USING btree (owner_id)
  WHERE ((name IS NULL) AND (deleted_at IS NULL));

CREATE INDEX kitchens_owner_id_idx ON public.kitchens USING btree (owner_id);

CREATE POLICY "kitchens_delete_own" ON "public"."kitchens"
  FOR DELETE
  TO "authenticated"
  USING ((owner_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "kitchens_insert_own" ON "public"."kitchens"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "kitchens_select_own" ON "public"."kitchens"
  FOR SELECT
  TO "authenticated"
  USING ((owner_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "kitchens_update_own" ON "public"."kitchens"
  FOR UPDATE
  TO "authenticated"
  USING ((owner_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));
