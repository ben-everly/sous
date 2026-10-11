alter table public.recipes add constraint recipes_nutrition_check check (extensions.jsonb_matches_schema('{
  "type": "object", "required": ["@type"],
  "properties": {"@type": {"const": "NutritionInformation"}},
  "additionalProperties": {
    "anyOf": [
      {"type": "string", "pattern": "\\S"},
      {"type": "array", "minItems": 1, "items": {"type": "string", "pattern": "\\S"}}
    ]
  }
}', nutrition));
