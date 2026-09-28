begin;

insert into public.recipes (slug, source_url, name, ingredients, directions)
values (
  'zz-test-black-bean-soup',
  'https://www.myplate.gov/recipes/black-bean-soup',
  'Black Bean Soup',
  '[{"name": null, "items": ["1 tablespoon vegetable oil (or cooking oil of choice)", "2 cans black beans"]}]'::jsonb,
  '[{"name": null, "steps": ["Heat oil in a skillet.", "Add beans."]}]'::jsonb
);

select plan(12);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.recipes'::regclass),
  'RLS is enabled on public.recipes'
);

select is(
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'recipes' and cmd <> 'SELECT'),
  0::bigint,
  'public.recipes carries no insert, update or delete policy'
);

set local role anon;
select is(
  (select count(*) from public.recipes where slug = 'zz-test-black-bean-soup'),
  1::bigint,
  'anon can read recipes'
);
select is(
  (select name from public.recipes where slug = 'zz-test-black-bean-soup'),
  'Black Bean Soup',
  'anon reads the granted columns'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-anon-insert', 'Anon', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '42501',
  null,
  'anon cannot insert a recipe'
);
select throws_ok(
  $$update public.recipes set name = 'Hacked' where slug = 'zz-test-black-bean-soup'$$,
  '42501',
  null,
  'anon cannot update a recipe'
);
select throws_ok(
  $$delete from public.recipes where slug = 'zz-test-black-bean-soup'$$,
  '42501',
  null,
  'anon cannot delete a recipe'
);

set local role authenticated;
select is(
  (select count(*) from public.recipes where slug = 'zz-test-black-bean-soup'),
  1::bigint,
  'authenticated can read recipes'
);
select throws_ok(
  $$insert into public.recipes (slug, name, ingredients, directions)
      values ('zz-test-user-insert', 'Mine', '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["s"]}]'::jsonb)$$,
  '42501',
  null,
  'authenticated cannot insert a recipe'
);
select throws_ok(
  $$update public.recipes set name = 'Hacked' where slug = 'zz-test-black-bean-soup'$$,
  '42501',
  null,
  'authenticated cannot update a recipe'
);
select throws_ok(
  $$delete from public.recipes where slug = 'zz-test-black-bean-soup'$$,
  '42501',
  null,
  'authenticated cannot delete a recipe'
);

reset role;
alter table public.recipes add column internal_note text;
set local role anon;
select throws_ok(
  $$select internal_note from public.recipes$$,
  '42501',
  null,
  'a column added without its own grant stays unreadable to anon'
);

reset role;
select * from finish();
rollback;
