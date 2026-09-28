create extension if not exists pg_jsonschema with schema extensions;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  source_url text check (source_url like 'https://%'),

  name text not null check (btrim(name) <> ''),
  description text,
  ingredients jsonb not null check (extensions.jsonb_matches_schema('{
    "type": "array", "minItems": 1,
    "items": {
      "type": "object", "required": ["name", "items"],
      "properties": {
        "name": {"type": ["string", "null"]},
        "items": {"type": "array", "minItems": 1, "items": {"type": "string", "pattern": "\\S"}}
      }
    }
  }', ingredients)),
  directions jsonb not null check (extensions.jsonb_matches_schema('{
    "type": "array", "minItems": 1,
    "items": {
      "type": "object", "required": ["name", "steps"],
      "properties": {
        "name": {"type": ["string", "null"]},
        "steps": {"type": "array", "minItems": 1, "items": {"type": "string", "pattern": "\\S"}}
      }
    }
  }', directions)),
  yield text,
  nutrition jsonb,
  notes text,
  contributor text
);

alter table public.recipes enable row level security;

-- Column-level rather than table-level, so a column added later stays unreadable until its
-- own grant lands, despite the policy's `using (true)`.
revoke all on public.recipes from anon, authenticated;
grant select (
  id, slug, source_url, name, description, ingredients, directions,
  yield, nutrition, notes, contributor
) on public.recipes to anon, authenticated;

create policy "recipes_select_all" on public.recipes
  for select to anon, authenticated using (true);
