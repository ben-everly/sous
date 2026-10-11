begin;

select plan(32);

insert into public.recipes (slug, name, ingredients, directions)
values ('zz-test-mango-salsa1', 'Mango Salsa', '[{"name": null, "items": ["2 mangoes"]}]'::jsonb, '[{"name": null, "steps": ["Dice."]}]'::jsonb);
select is(
  (select count(*) from public.recipes where slug = 'zz-test-mango-salsa1' and source_url is null),
  1::bigint,
  'source_url, description, yield, nutrition, notes and contributor are optional'
);

select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-mango-salsa1', 'Dupe', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23505',
  null,
  'slug is unique, so re-running the seed cannot duplicate a recipe'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('ZZ-Test-Mango-Salsa', 'Shouty', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'an uppercase slug is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz test mango salsa', 'Spaced', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'a slug with a space is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, source_url, name, ingredients, directions)
      values ('zz-test-insecure', 'http://www.myplate.gov/recipes/insecure', 'Insecure', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'a non-https source_url is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-blank-name', '   ', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'a whitespace-only name is rejected'
);

select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-ing-empty', 'Empty', '[]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'an empty ingredients array is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-ing-object', 'Object', '{"items": ["x"]}'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'ingredients as an object rather than an array of sections is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-ing-bare', 'Bare', '["x"]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'a bare string in place of an ingredient section is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-ing-key-missing', 'KeyMissing', '[{"name": null}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'an ingredient section with no items key is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-ing-key-string', 'KeyString', '[{"name": null, "items": "x"}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'an ingredient section whose items is not an array is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-ing-key-empty', 'KeyEmpty', '[{"name": null, "items": []}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'an ingredient section with an empty items array is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-ing-entry-null', 'EntryNull', '[{"name": null, "items": ["x", null]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'a non-string ingredient entry is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-ing-entry-blank', 'EntryBlank', '[{"name": null, "items": ["x", "   "]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'a whitespace-only ingredient entry is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-ing-name-missing', 'NameMissing', '[{"items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'an ingredient section with no name key is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-ing-name-number', 'NameNumber', '[{"name": 1, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '23514',
  null,
  'a non-string ingredient section name is rejected'
);

select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-dir-empty', 'Empty', '[{"name": null, "items": ["x"]}]'::jsonb, '[]'::jsonb)$$,
  '23514',
  null,
  'an empty directions array is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-dir-object', 'Object', '[{"name": null, "items": ["x"]}]'::jsonb, '{"steps": ["x"]}'::jsonb)$$,
  '23514',
  null,
  'directions as an object rather than an array of sections is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-dir-bare', 'Bare', '[{"name": null, "items": ["x"]}]'::jsonb, '["x"]'::jsonb)$$,
  '23514',
  null,
  'a bare string in place of a direction section is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-dir-key-missing', 'KeyMissing', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null}]'::jsonb)$$,
  '23514',
  null,
  'a direction section with no steps key is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-dir-key-string', 'KeyString', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": "x"}]'::jsonb)$$,
  '23514',
  null,
  'a direction section whose steps is not an array is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-dir-key-empty', 'KeyEmpty', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": []}]'::jsonb)$$,
  '23514',
  null,
  'a direction section with an empty steps array is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-dir-entry-null', 'EntryNull', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["x", null]}]'::jsonb)$$,
  '23514',
  null,
  'a non-string direction entry is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-dir-entry-blank', 'EntryBlank', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["x", "   "]}]'::jsonb)$$,
  '23514',
  null,
  'a whitespace-only direction entry is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-dir-name-missing', 'NameMissing', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"steps": ["x"]}]'::jsonb)$$,
  '23514',
  null,
  'a direction section with no name key is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-dir-name-number', 'NameNumber', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": 1, "steps": ["x"]}]'::jsonb)$$,
  '23514',
  null,
  'a non-string direction section name is rejected'
);

select lives_ok(
  $$insert into public.recipes (slug, name, ingredients, directions, nutrition)
      values ('zz-test-nut-ok', 'Nutrition', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb, '{"@type": "NutritionInformation", "calories": "100 kcal", "servingSize": ["1/6 of recipe", "1 cup"]}'::jsonb)$$,
  'a NutritionInformation object with string and string-array values is accepted'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions, nutrition)
      values ('zz-test-nut-array', 'Nutrition', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb, '[{"@type": "NutritionInformation"}]'::jsonb)$$,
  '23514',
  null,
  'nutrition as an array rather than an object is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions, nutrition)
      values ('zz-test-nut-type-missing', 'Nutrition', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb, '{"calories": "100 kcal"}'::jsonb)$$,
  '23514',
  null,
  'nutrition with no @type is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions, nutrition)
      values ('zz-test-nut-type-wrong', 'Nutrition', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb, '{"@type": "Recipe", "calories": "100 kcal"}'::jsonb)$$,
  '23514',
  null,
  'nutrition whose @type is not NutritionInformation is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions, nutrition)
      values ('zz-test-nut-number', 'Nutrition', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb, '{"@type": "NutritionInformation", "calories": 100}'::jsonb)$$,
  '23514',
  null,
  'a non-string nutrition value is rejected'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions, nutrition)
      values ('zz-test-nut-blank', 'Nutrition', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb, '{"@type": "NutritionInformation", "servingSize": ["1 cup", "  "]}'::jsonb)$$,
  '23514',
  null,
  'a whitespace-only nutrition value is rejected'
);

select * from finish();
rollback;
