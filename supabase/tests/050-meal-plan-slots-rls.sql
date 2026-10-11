begin;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"full_name": "Alice"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{"full_name": "Bob"}'::jsonb);

update public.kitchens set id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  where owner_id = '11111111-1111-1111-1111-111111111111';
update public.kitchens set id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  where owner_id = '22222222-2222-2222-2222-222222222222';

insert into public.recipes (id, slug, name, ingredients, directions)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'zz-mps-1', 'Zzmps One',
    '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["x"]}]'::jsonb),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'zz-mps-2', 'Zzmps Two',
    '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["x"]}]'::jsonb);

insert into public.recipes (slug, name, ingredients, directions)
select 'zz-mps-lim-' || lpad(i::text, 2, '0'), 'Zzmps Lim ' || i,
  '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["x"]}]'::jsonb
from generate_series(1, 21) i;

select plan(36);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.meal_plan_slots'::regclass),
  'RLS is enabled on public.meal_plan_slots'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 1, 'dinner', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  'Alice can insert a slot into her live kitchen on a near date'
);
select is((select count(*) from public.meal_plan_slots), 1::bigint, 'Alice sees her slot');

select lives_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 1, 'dinner', 'dddddddd-dddd-dddd-dddd-dddddddddddd')$$,
  'A second recipe can join the same meal'
);
select is((select count(*) from public.meal_plan_slots), 2::bigint, 'Both recipes in the meal persist');

select throws_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 1, 'dinner', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  '23505',
  null,
  'A duplicate (kitchen, date, meal, recipe) insert fails'
);
select lives_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 1, 'dinner', 'cccccccc-cccc-cccc-cccc-cccccccccccc')
    on conflict (kitchen_id, date, meal_type, recipe_id) do nothing$$,
  'The same duplicate with ON CONFLICT DO NOTHING succeeds'
);
select is((select count(*) from public.meal_plan_slots), 2::bigint, 'ON CONFLICT DO NOTHING leaves the count unchanged');

insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id, created_at, updated_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 2, 'breakfast', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '2000-01-01', '2000-01-01');
select ok(
  (select created_at > now() - interval '1 minute' and updated_at > now() - interval '1 minute'
     from public.meal_plan_slots where date = current_date + 2),
  'Client-supplied created_at and updated_at are overwritten'
);

select throws_ok(
  $$update public.meal_plan_slots set meal_type = 'lunch' where date = current_date + 2$$,
  '42501',
  null,
  'Alice cannot update a slot'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text,
  true
);

select is((select count(*) from public.meal_plan_slots), 0::bigint, 'Bob sees none of Alice''s slots');
select throws_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 3, 'lunch', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  '42501',
  null,
  'Bob cannot insert into Alice''s kitchen'
);
with d as (delete from public.meal_plan_slots returning 1)
select is((select count(*) from d), 0::bigint, 'Bob deleting Alice''s slots affects zero rows');

select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text,
  true
);

select is((select count(*) from public.meal_plan_slots), 3::bigint, 'Bob''s delete left Alice''s slots intact');
with d as (delete from public.meal_plan_slots where date = current_date + 2 returning 1)
select is((select count(*) from d), 1::bigint, 'Alice can delete her own slot');

select isnt_empty(
  $$select 1 from public.soft_delete_kitchen('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'Alice trashes her kitchen'
);
select is((select count(*) from public.meal_plan_slots), 0::bigint, 'A trashed kitchen''s slots are invisible');
select throws_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 4, 'lunch', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  '42501',
  null,
  'A trashed kitchen is unwritable'
);
select isnt_empty(
  $$select 1 from public.restore_kitchen('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'Alice restores her kitchen'
);
select is((select count(*) from public.meal_plan_slots), 2::bigint, 'Restoring brings the original slots back');

select lives_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 7, 'lunch', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  'A slot 7 days back can be inserted'
);
select throws_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 8, 'lunch', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  '42501',
  null,
  'A slot 8 days back cannot be inserted'
);
select lives_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 182, 'lunch', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  'A slot 182 days ahead can be inserted'
);
select throws_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 183, 'lunch', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  '42501',
  null,
  'A slot 183 days ahead cannot be inserted'
);

select lives_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 10, 'dinner', id
    from public.recipes where slug like 'zz-mps-lim-%' and slug <> 'zz-mps-lim-21'$$,
  'A meal can hold 20 recipes'
);
select throws_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 10, 'dinner', id
    from public.recipes where slug = 'zz-mps-lim-21'$$,
  '23514',
  null,
  'A 21st recipe in one meal fails'
);
select lives_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 10, 'dinner', id
    from public.recipes where slug = 'zz-mps-lim-01'
    on conflict (kitchen_id, date, meal_type, recipe_id) do nothing$$,
  'Re-adding a recipe to a full meal with ON CONFLICT DO NOTHING succeeds'
);

reset role;
insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date - 30, 'breakfast', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
set local role authenticated;

select is(
  (select count(*) from public.meal_plan_slots where date = current_date - 30),
  1::bigint,
  'A slot older than the insert window stays visible'
);
with d as (delete from public.meal_plan_slots where date = current_date - 30 returning 1)
select is((select count(*) from d), 1::bigint, 'A slot older than the insert window can be deleted');

reset role;
select set_config('request.jwt.claims', null, true);

select throws_ok(
  $$delete from public.recipes where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  '23503',
  null,
  'A planned recipe cannot be deleted'
);

set local role anon;
select throws_ok(
  $$select * from public.meal_plan_slots$$,
  '42501',
  null,
  'anon cannot select'
);
select throws_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', current_date + 5, 'lunch', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  '42501',
  null,
  'anon cannot insert'
);
reset role;

select ok(
  (select count(*) from public.meal_plan_slots where kitchen_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') > 0,
  'Alice''s kitchen has slots before the purge'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text,
  true
);
select isnt_empty(
  $$select 1 from public.soft_delete_kitchen('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'Alice trashes her kitchen again'
);
select isnt_empty(
  $$select 1 from public.purge_kitchen('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  'Alice purges her trashed kitchen'
);
reset role;

select is(
  (select count(*) from public.meal_plan_slots where kitchen_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'Alice''s purge removes the slots RLS hid from her'
);

select * from finish();
rollback;
