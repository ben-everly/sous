CREATE TABLE "public"."profiles" (
  "id"           uuid                     NOT NULL,
  "display_name" text,
  "avatar_url"   text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_avatar_url_check" CHECK (((avatar_url IS NULL) OR (avatar_url ~* '^https://'::text))),
  CONSTRAINT "profiles_display_name_check" CHECK ((char_length(display_name) <= 200)),
  CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_set_timestamps
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auth_hooks.set_timestamps();

-- No insert/delete policy: handle_new_user is the only writer and the auth.users cascade the
-- only remover.
CREATE POLICY "profiles_select_own" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "profiles_update_own" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((id = ( SELECT auth.uid() AS uid)));
