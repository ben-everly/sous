CREATE TABLE "public"."meal_plan_slots" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "kitchen_id" uuid                     NOT NULL,
  "date"       date                     NOT NULL,
  "meal_type"  public.meal_type         NOT NULL,
  "recipe_id"  uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "meal_plan_slots_date_check" CHECK (((date >= '0001-01-01'::date) AND (date <= '9999-12-31'::date))),
  CONSTRAINT "meal_plan_slots_kitchen_id_date_meal_type_recipe_id_key" UNIQUE (kitchen_id, date, meal_type, recipe_id),
  CONSTRAINT "meal_plan_slots_kitchen_id_fkey" FOREIGN KEY (kitchen_id) REFERENCES public.kitchens(id) ON DELETE CASCADE,
  CONSTRAINT "meal_plan_slots_pkey" PRIMARY KEY (id),
  CONSTRAINT "meal_plan_slots_recipe_id_fkey" FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE RESTRICT
);

ALTER TABLE "public"."meal_plan_slots"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX meal_plan_slots_recipe_id_idx ON public.meal_plan_slots USING btree (recipe_id);

CREATE TRIGGER meal_plan_slots_enforce_kitchen_limits
  AFTER INSERT ON public.meal_plan_slots
  FOR EACH ROW
  EXECUTE FUNCTION internal.meal_plan_slots_enforce_kitchen_limits();

CREATE TRIGGER meal_plan_slots_set_timestamps
  BEFORE INSERT OR UPDATE ON public.meal_plan_slots
  FOR EACH ROW
  EXECUTE FUNCTION internal.set_timestamps();

CREATE POLICY "meal_plan_slots_delete_own" ON "public"."meal_plan_slots"
  FOR DELETE
  TO "authenticated"
  USING ((kitchen_id IN ( SELECT live_kitchens.id
   FROM public.live_kitchens)));

CREATE POLICY "meal_plan_slots_insert_own" ON "public"."meal_plan_slots"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((kitchen_id IN ( SELECT live_kitchens.id
   FROM public.live_kitchens)));

CREATE POLICY "meal_plan_slots_select_own" ON "public"."meal_plan_slots"
  FOR SELECT
  TO "authenticated"
  USING ((kitchen_id IN ( SELECT live_kitchens.id
   FROM public.live_kitchens)));

REVOKE ALL ON TABLE "public"."meal_plan_slots" FROM "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."meal_plan_slots" TO "authenticated";
