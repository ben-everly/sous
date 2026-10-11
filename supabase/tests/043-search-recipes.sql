begin;

select plan(16);

insert into public.recipes (slug, name, description, ingredients, directions)
select
  s.slug, s.name, s.description,
  '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["x"]}]'::jsonb
from (values
  ('zz-srch-1', 'Zqxv Tacos', 'with zqlime zest'),
  ('zz-srch-2', 'Plain Dish', 'a zqxvish side'),
  ('zz-srch-3', 'Zqnull Stew', null),
  ('zz-srch-4', 'Zqpct 50% Pie', null),
  ('zz-srch-5', 'Zqpct 50x Pie', null),
  ('zz-srch-6', 'Zqus a_b Pie', null),
  ('zz-srch-7', 'Zqus aXb Pie', null),
  ('zz-srch-8', 'Zqrank Bowl', 'with zqzest'),
  ('zz-srch-9', 'Aaa Dish', 'zqrank and zqzest')
) as s(slug, name, description);

insert into public.recipes (slug, name, ingredients, directions)
select
  'zz-srch-many-' || i, 'Zqmany ' || lpad(i::text, 2, '0'),
  '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["x"]}]'::jsonb
from generate_series(1, 25) i;

set local role authenticated;

select is(
  (select array_agg(slug order by n) from public.search_recipes('zqx') with ordinality as t(id, slug, name, n)),
  array['zz-srch-1', 'zz-srch-2'],
  'a partial word matches, name matches ahead of description-only'
);
select is(
  (select slug from public.search_recipes('ZQXV TACOS')),
  'zz-srch-1',
  'matching ignores case'
);
select is(
  (select slug from public.search_recipes('zqxv zqlime')),
  'zz-srch-1',
  'words matching different columns both count'
);
select is(
  (select array_agg(slug order by n) from public.search_recipes('zqrank zqzest') with ordinality as t(id, slug, name, n)),
  array['zz-srch-8', 'zz-srch-9'],
  'a partial name match ranks ahead of a description-only match'
);
select is_empty(
  $$select * from public.search_recipes('zqxv nonexistentword')$$,
  'a word in neither column excludes the recipe'
);
select is(
  (select slug from public.search_recipes('zqnull')),
  'zz-srch-3',
  'a null description still matches on name'
);
select is(
  (select array_agg(slug) from public.search_recipes('zqpct 50%')),
  array['zz-srch-4'],
  '% matches literally'
);
select is(
  (select array_agg(slug) from public.search_recipes('zqus a_b')),
  array['zz-srch-6'],
  '_ matches literally'
);
select is_empty($$select * from public.search_recipes(null)$$, 'null query returns no rows');
select is_empty($$select * from public.search_recipes('')$$, 'empty query returns no rows');
select is_empty($$select * from public.search_recipes('   ')$$, 'whitespace query returns no rows');
select is(
  (select count(*) from public.search_recipes('zqmany')),
  20::bigint,
  'at most 20 rows are returned'
);
select is(
  (select array_agg(k order by k) from jsonb_object_keys((select to_jsonb(s) from public.search_recipes('zqxv') s limit 1)) k),
  array['id', 'name', 'slug'],
  'the result has exactly id, slug, name'
);
select isnt_empty(
  $$select * from public.search_recipes('zqxv' || repeat(' ', 200) || 'zqnomatch')$$,
  'words past the first 200 characters are ignored'
);
select lives_ok($$select * from public.search_recipes('zqx')$$, 'authenticated can execute');

-- Calling it as anon would raise 42501, but a denied function call segfaults the local
-- Postgres 17.6 backend, so assert the grant instead.
select ok(
  not has_function_privilege('anon', 'public.search_recipes(text)', 'execute'),
  'anon cannot execute'
);

reset role;
select * from finish();

rollback;
