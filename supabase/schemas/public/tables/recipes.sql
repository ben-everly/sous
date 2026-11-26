CREATE TABLE "public"."recipes" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"        text                     NOT NULL,
  "source_url"  text,
  "name"        text                     NOT NULL,
  "description" text,
  "ingredients" jsonb                    NOT NULL,
  "directions"  jsonb                    NOT NULL,
  "yield"       text,
  "nutrition"   jsonb,
  "notes"       text,
  "contributor" text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "recipes_directions_check" CHECK (extensions.jsonb_matches_schema('{
    "type": "array", "minItems": 1,
    "items": {
      "type": "object", "required": ["name", "steps"],
      "properties": {
        "name": {"type": ["string", "null"]},
        "steps": {"type": "array", "minItems": 1, "items": {"type": "string", "pattern": "\\S"}}
      }
    }
  }'::json, directions)),
  CONSTRAINT "recipes_ingredients_check" CHECK (extensions.jsonb_matches_schema('{
    "type": "array", "minItems": 1,
    "items": {
      "type": "object", "required": ["name", "items"],
      "properties": {
        "name": {"type": ["string", "null"]},
        "items": {"type": "array", "minItems": 1, "items": {"type": "string", "pattern": "\\S"}}
      }
    }
  }'::json, ingredients)),
  CONSTRAINT "recipes_name_check" CHECK ((btrim(name) <> ''::text)),
  CONSTRAINT "recipes_nutrition_check" CHECK (extensions.jsonb_matches_schema('{
  "type": "object", "required": ["@type"],
  "properties": {"@type": {"const": "NutritionInformation"}},
  "additionalProperties": {
    "anyOf": [
      {"type": "string", "pattern": "\\S"},
      {"type": "array", "minItems": 1, "items": {"type": "string", "pattern": "\\S"}}
    ]
  }
}'::json, nutrition)),
  CONSTRAINT "recipes_pkey" PRIMARY KEY (id),
  CONSTRAINT "recipes_slug_check" CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  CONSTRAINT "recipes_slug_key" UNIQUE (slug),
  CONSTRAINT "recipes_source_url_check" CHECK ((source_url ~~ 'https://%'::text))
);

ALTER TABLE "public"."recipes"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER recipes_set_timestamps_on_insert
  BEFORE INSERT ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION internal.set_timestamps();

CREATE TRIGGER recipes_set_timestamps_on_update
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  WHEN ((old.* IS DISTINCT FROM new.*))
  EXECUTE FUNCTION internal.set_timestamps();

CREATE POLICY "recipes_select_all" ON "public"."recipes"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

REVOKE ALL ON TABLE "public"."recipes" FROM "authenticated";

-- Reads are granted per column: a new column stays unreadable by clients until it's listed here.
GRANT SELECT (id, slug, source_url, name, description, ingredients, directions, yield, nutrition, notes, contributor, created_at, updated_at)
  ON TABLE "public"."recipes" TO "anon", "authenticated";
