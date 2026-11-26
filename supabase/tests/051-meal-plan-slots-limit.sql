begin;

insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"full_name": "Alice"}'::jsonb);

update public.kitchens set id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  where owner_id = '11111111-1111-1111-1111-111111111111';

insert into public.recipes (id, slug, name, ingredients, directions)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'zz-mpsl-1', 'Zzmpsl One',
  '[{"name": null, "items": ["x"]}]'::jsonb, '[{"name": null, "steps": ["x"]}]'::jsonb);

set local session_replication_role = replica;
insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', date '2000-01-01' + d, m, 'cccccccc-cccc-cccc-cccc-cccccccccccc'
from generate_series(0, 16666) d, unnest(enum_range(null::public.meal_type)) m;
delete from public.meal_plan_slots where ctid in (
  select ctid from public.meal_plan_slots where kitchen_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  order by date desc, meal_type limit 2
);
set local session_replication_role = origin;

select plan(5);

select is(
  (select count(*) from public.meal_plan_slots where kitchen_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  49999::bigint,
  'Kitchen is seeded to 49999 slots'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2100-01-01', 'dinner', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  'The 50000th slot can be inserted'
);
select throws_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2100-01-02', 'dinner', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  'SC002',
  'a kitchen holds at most 50000 meal plan slots',
  'The 50001st slot fails'
);
select lives_ok(
  $$insert into public.meal_plan_slots (kitchen_id, date, meal_type, recipe_id)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2100-01-01', 'dinner', 'cccccccc-cccc-cccc-cccc-cccccccccccc')
    on conflict (kitchen_id, date, meal_type, recipe_id) do nothing$$,
  'Re-adding an existing slot with ON CONFLICT DO NOTHING succeeds at the cap'
);
select is(
  (select count(*) from public.meal_plan_slots where kitchen_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  50000::bigint,
  'The kitchen holds exactly 50000 slots'
);

select * from finish();
rollback;
