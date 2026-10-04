begin;

select plan(6);

insert into public.recipes (slug, name, ingredients, directions, created_at, updated_at)
values (
  'zz-test-oat-bars', 'Oat Bars',
  '[{"name": null, "items": ["2 cups oats"]}]'::jsonb, '[{"name": null, "steps": ["Bake."]}]'::jsonb,
  '2000-01-01', '2000-01-01'
);
select is(
  (select (created_at, updated_at) from public.recipes where slug = 'zz-test-oat-bars'),
  (now(), now()),
  'created_at and updated_at supplied on insert are overwritten with now()'
);

-- now() is fixed for the whole transaction, so a bump is only visible from a backdated row,
-- and the update trigger would overwrite a plain backdating update.
set local session_replication_role = replica;
update public.recipes set created_at = '2000-01-01', updated_at = '2000-01-01'
  where slug = 'zz-test-oat-bars';
set local session_replication_role = origin;

insert into public.recipes (slug, name, ingredients, directions)
values ('zz-test-oat-bars', 'Oat Bars', '[{"name": null, "items": ["2 cups oats"]}]'::jsonb, '[{"name": null, "steps": ["Bake."]}]'::jsonb)
on conflict (slug) do update set
  name = excluded.name, ingredients = excluded.ingredients, directions = excluded.directions;
select is(
  (select updated_at from public.recipes where slug = 'zz-test-oat-bars'),
  '2000-01-01'::timestamptz,
  'a re-seed with unchanged content leaves updated_at alone'
);

insert into public.recipes (slug, name, ingredients, directions)
values ('zz-test-oat-bars', 'Chewy Oat Bars', '[{"name": null, "items": ["2 cups oats"]}]'::jsonb, '[{"name": null, "steps": ["Bake."]}]'::jsonb)
on conflict (slug) do update set
  name = excluded.name, ingredients = excluded.ingredients, directions = excluded.directions;
select is(
  (select updated_at from public.recipes where slug = 'zz-test-oat-bars'),
  now(),
  'a re-seed with changed content bumps updated_at'
);
select is(
  (select created_at from public.recipes where slug = 'zz-test-oat-bars'),
  '2000-01-01'::timestamptz,
  'an update preserves created_at'
);

set local role anon;
select lives_ok(
  $$select created_at, updated_at from public.recipes$$,
  'anon can read created_at and updated_at'
);
set local role authenticated;
select lives_ok(
  $$select created_at, updated_at from public.recipes$$,
  'authenticated can read created_at and updated_at'
);

reset role;
select * from finish();
rollback;
